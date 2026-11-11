import fs from 'node:fs'

import { createApp } from './app'
import { config } from './config'
import { closeDatabase, openDatabase } from './db'
import { deleteExpiredSessions } from './services/users'
import { pruneOldAttempts } from './services/loginAttempts'

fs.mkdirSync(config.uploadDir, { recursive: true })

const db = openDatabase(config.dbPath)
deleteExpiredSessions(db)
pruneOldAttempts(db)

const app = createApp({ config, db })

const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port} (${config.nodeEnv})`)
  console.log(`[server] database: ${config.dbPath}`)
})

function shutdown(signal: string): void {
  console.log(`[server] ${signal} received, shutting down`)
  server.close(() => {
    closeDatabase(db)
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
