import fs from 'node:fs'
import readline from 'node:readline'

import { config } from '../src/config'
import { closeDatabase, openDatabase } from '../src/db'
import {
  assertValidPassword,
  assertValidUsername,
  countUsers,
  createUser,
} from '../src/services/users'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function promptHidden(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })
  const mutableRl = rl as unknown as { _writeToOutput: (text: string) => void }
  const originalWrite = mutableRl._writeToOutput.bind(rl)
  mutableRl._writeToOutput = (text: string) => {
    if (text === question) {
      originalWrite(text)
      return
    }
    if (text.trim().length > 0) originalWrite('*')
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

async function readCredential(label: string, envValue: string | undefined): Promise<string> {
  if (envValue) return envValue
  if (!process.stdin.isTTY) {
    throw new Error(
      `缺少 ${label}。非交互环境请通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 提供。`,
    )
  }
  return label.includes('密码')
    ? promptHidden(`请输入${label}: `)
    : prompt(`请输入${label} [admin]: `)
}

async function main(): Promise<void> {
  fs.mkdirSync(config.uploadDir, { recursive: true })
  const db = openDatabase(config.dbPath)

  try {
    const existing = countUsers(db)
    if (existing > 0) {
      console.log('[setup] 已存在管理员账号，跳过初始化。')
      console.log('[setup] 如需重置密码，请进入后台「安全设置」修改。')
      return
    }

    console.log('┌──────────────────────────────────────────────┐')
    console.log('│  饿师傅的技术札记 · 首次初始化               │')
    console.log('└──────────────────────────────────────────────┘')
    console.log(`数据库: ${config.dbPath}`)

    let username = process.env.ADMIN_USERNAME?.trim() ?? ''
    if (!username) {
      if (!process.stdin.isTTY) {
        throw new Error('非交互环境请设置 ADMIN_USERNAME 环境变量。')
      }
      username = (await prompt('管理员用户名 [admin]: ')) || 'admin'
    }
    assertValidUsername(username)

    const password = await readCredential('管理员密码（至少 10 位）', process.env.ADMIN_PASSWORD)
    assertValidPassword(password)

    await createUser(db, username, password)
    console.log(`[setup] 管理员「${username}」创建成功。密码仅以 bcrypt 哈希形式存储。`)
    console.log('[setup] 下一步：pnpm dev，然后访问 /admin 登录。')
    console.log('[setup] 建议登录后立即在「安全设置」中开启 TOTP 两步验证。')
  } finally {
    closeDatabase(db)
  }
}

main().catch((error: unknown) => {
  console.error('[setup] 初始化失败:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
