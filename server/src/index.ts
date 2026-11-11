import { createApp } from './app'
import { config } from './config'

const app = createApp({ config })

const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port} (${config.nodeEnv})`)
})

function shutdown(signal: string): void {
  console.log(`[server] ${signal} received, shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
