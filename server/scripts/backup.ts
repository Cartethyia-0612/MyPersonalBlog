import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

import { config } from '../src/config'

async function main(): Promise<void> {
  if (!fs.existsSync(config.dbPath)) {
    throw new Error(`数据库不存在：${config.dbPath}。请先运行 pnpm setup。`)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupsRoot = path.join(config.projectRoot, 'backups')
  fs.mkdirSync(backupsRoot, { recursive: true })

  let target = path.join(backupsRoot, stamp)
  let suffix = 1
  while (fs.existsSync(target)) {
    target = path.join(backupsRoot, `${stamp}-${suffix}`)
    suffix += 1
  }

  const staging = path.join(backupsRoot, `.${stamp}.staging`)
  const dbTarget = path.join(staging, 'blog.db')
  const uploadsTarget = path.join(staging, 'uploads')

  fs.mkdirSync(staging, { recursive: true, mode: 0o700 })

  try {
    const db = new Database(config.dbPath)
    try {
      await db.backup(dbTarget)
    } finally {
      db.close()
    }
    fs.chmodSync(dbTarget, 0o600)

    const check = new Database(dbTarget, { readonly: true })
    try {
      const result = check.pragma('integrity_check', { simple: true }) as unknown
      if (result !== 'ok') {
        throw new Error(`备份完整性检查失败：${String(result)}`)
      }
    } finally {
      check.close()
    }

    // Opening the copied WAL database for the integrity check can leave empty
    // sidecar files behind; a backup should contain only the database.
    for (const suffix of ['-shm', '-wal']) {
      fs.rmSync(`${dbTarget}${suffix}`, { force: true })
    }

    if (fs.existsSync(config.uploadDir)) {
      fs.cpSync(config.uploadDir, uploadsTarget, { recursive: true })
    }

    fs.writeFileSync(
      path.join(staging, '.complete'),
      JSON.stringify({ createdAt: new Date().toISOString(), database: 'blog.db' }, null, 2),
      { mode: 0o600 },
    )
    fs.renameSync(staging, target)
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true })
    throw error
  }

  console.log(`[backup] 数据库已备份: ${path.join(target, 'blog.db')}`)
  if (fs.existsSync(path.join(target, 'uploads'))) {
    console.log(`[backup] 上传目录已备份: ${path.join(target, 'uploads')}`)
  }
  console.log(
    '[backup] 重要：备份目录不包含 .env / APP_SECRET；请另行加密备份 APP_SECRET，否则恢复后无法解密 TOTP。',
  )
  console.log('[backup] 请将整个备份目录复制到另一台机器或对象存储。')
}

main().catch((error: unknown) => {
  console.error('[backup] 备份失败:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
