// Server entry point.
//
// Responsibilities:
// 1. Build the Fastify app via the factory.
// 2. Start listening on the configured host/port.
// 3. Handle graceful shutdown on SIGTERM / SIGINT.
// 4. Catch unhandled errors so the process never dies silently.
//
// Graceful shutdown matters because deploys, scaling, and Ctrl+C all send
// signals. We want in-flight requests to finish and resources (DB pools,
// etc.) to close cleanly — otherwise users see dropped connections and
// data can be left in an inconsistent state.

import { buildApp } from './app.js'
import { config } from './config.js'
import { logger } from './logger.js'

async function start(): Promise<void> {
  const app = await buildApp()

  // --- Graceful shutdown ---
  //
  // On a shutdown signal: stop accepting new connections, let active
  // requests drain, close the server, then exit. A timeout guards against
  // a hung request blocking shutdown forever.
  const GRACEFUL_TIMEOUT_MS = 10_000

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutdown signal received, closing server')

    // Force-exit if graceful close takes too long.
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit')
      process.exit(1)
    }, GRACEFUL_TIMEOUT_MS)
    // unref so this timer itself doesn't keep the process alive.
    forceExit.unref()

    try {
      // app.close() stops accepting new requests and waits for in-flight
      // ones to complete, running any onClose hooks (DB disconnect, etc.).
      await app.close()
      logger.info('Server closed cleanly')
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'Error during shutdown')
      process.exit(1)
    }
  }

  // SIGTERM: sent by orchestrators (Docker/K8s) on deploy or scale-down.
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  // SIGINT: sent by Ctrl+C in the terminal during local development.
  process.on('SIGINT', () => void shutdown('SIGINT'))

  // Last-resort safety nets: log and exit rather than dying silently.
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
    process.exit(1)
  })
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception')
    process.exit(1)
  })

  // --- Start listening ---
  try {
    await app.listen({ port: config.port, host: config.host })
    // Fastify already logs the listen address via our Pino instance.
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}

void start()
