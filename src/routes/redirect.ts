import { Hono } from 'hono'
import type { Db, LinkRow } from '../db'

/** Public redirect endpoint: `GET /:code` sends visitors to the original URL. */
export const redirectRoutes = (db: Db) => {
  const routes = new Hono()

  const findByCode = db.query<LinkRow, [string]>(
    'SELECT * FROM links WHERE code = ?',
  )

  const incrementClicks = db.query(
    'UPDATE links SET clicks = clicks + 1 WHERE code = ?',
  )

  routes.get('/:code', (c) => {
    const { code } = c.req.param()
    const row = findByCode.get(code)

    if (!row) return c.json({ error: 'Link not found' }, 404)

    if (row.expires_at !== null && row.expires_at < Date.now())
      return c.json({ error: 'Link expired' }, 410)

    incrementClicks.run(code)

    return c.redirect(row.url, 302)
  })

  return routes
}
