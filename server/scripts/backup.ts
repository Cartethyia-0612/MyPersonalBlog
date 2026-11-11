import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

import { config } from '../src/config'

async function main(): Promise<void> {
  if (!fs.existsSync(config.dbPath)) {
    throw new Error(`数据库不存在：${config.dbPath}。请先运行 pnpm setup。`)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const root = path.join(config.projectRoot, 'backups', stamp)
  const dbTarget = path.join(root, 'blog.db')
  const uploadsTarget = path.join(root, 'uploads')
  fs.mkdirSync(root, { recursive: true })

  const db = new Database(config.dbPath)
  try {
    await db.backup(dbTarget)
  } finally {
    db.close()
  }

  if (fs.existsSync(config.uploadDir)) {
    fs.cpSync(config.uploadDir, uploadsTarget, { recursive: true })
  }

  console.log(`[backup] 数据库已备份: ${dbTarget}`)
  if (fs.existsSync(uploadsTarget)) console.log(`[backup] 上传目录已备份: ${uploadsTarget}`)
  console.log('[backup] 请将整个备份目录复制到另一台机器或对象存储。')
}

main().catch((error: unknown) => {
  console.error('[backup] 备份失败:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
