import { Hono } from 'hono'
import type { Db, LinkRow } from '../db'
import { generateCode } from '../lib/code'
import { isHttpUrl, isValidAlias } from '../lib/validate'

/** Link management endpoints. The full contract lives in `docs/API.md`. */

type CreateBody = {
  url?: unknown
  alias?: unknown
  ttlSeconds?: unknown
}

export const linkRoutes = (db: Db) => {
  const routes = new Hono()

  const insert = db.query(
    'INSERT INTO links (code, url, created_at, expires_at, clicks) VALUES (?, ?, ?, ?, 0)',
  )
  const findByCode = db.query<LinkRow, [string]>(
    'SELECT * FROM links WHERE code = ?',
  )
  const removeByCode = db.query('DELETE FROM links WHERE code=?')

  routes.post('/api/links', async (c) => {
    let body: unknown

    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ error: 'Body must be a JSON object' }, 400)
    }

    const { url, alias, ttlSeconds } = body as CreateBody

    if (!isHttpUrl(url)) return c.json({ error: 'Invalid URL' }, 400)

    if (alias !== undefined && !isValidAlias(alias))
      return c.json({ error: 'Invalid alias' }, 400)

    if (
      ttlSeconds !== undefined &&
      (typeof ttlSeconds !== 'number' ||
        !Number.isInteger(ttlSeconds) ||
        ttlSeconds <= 0)
    )
      return c.json({ error: 'Invalid ttlSeconds' }, 400)

    const now = Date.now()
    const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null

    const codesToTry =
      alias !== undefined
        ? [alias]
        : Array.from({ length: 5 }, () => generateCode())

    for (const code of codesToTry) {
      try {
        insert.run(code, url, now, expiresAt)

        return c.json(
          {
            code,
            url,
            shortUrl: `${new URL(c.req.url).origin}/${code}`,
            clicks: 0,
            createdAt: now,
            expiresAt,
          },
          201,
        )
      } catch (err) {
        const message = String(err)
        if (message.includes('UNIQUE constraint failed')) {
          if (alias !== undefined) {
            return c.json(
              {
                error: 'Alias already taken',
              },
              409,
            )
          }
          continue
        }
        throw err
      }
    }

    return c.json({ error: 'Failed to create link' }, 500)
  })

  routes.get('/api/links/:code', (c) => {
    const { code } = c.req.param()
    const link = findByCode.get(code)

    if (!link) {
      return c.json({ error: 'Link not found' }, 404)
    }

    const { created_at, expires_at, ...row } = link

    return c.json(
      {
        ...row,
        createdAt: created_at,
        expiresAt: expires_at,
      },
      200,
    )
  })

  routes.delete('/api/links/:code', (c) => {
    const { code } = c.req.param()

    const res = removeByCode.run(code)

    if (res.changes === 0) return c.json({ error: 'Link not found' }, 404)

    return c.body(null, 204)
  })

  return routes
}
