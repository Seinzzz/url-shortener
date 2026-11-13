import { Hono } from 'hono'
import type { Db } from './db'
import { linkRoutes } from './routes/links'
import { redirectRoutes } from './routes/redirect'

/** Builds the app. The database is injected so tests can use an in-memory one. */
export function createApp(db: Db) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ status: 'ok' }, 200))

  app.route('/', linkRoutes(db))
  app.route('/', redirectRoutes(db))

  app.notFound((c) => c.json({ error: 'Not found' }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  return app
}

export type App = ReturnType<typeof createApp>
