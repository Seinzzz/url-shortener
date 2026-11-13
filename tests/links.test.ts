import { beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { createDb, type Db } from '../src/db'

let db: Db
let app: ReturnType<typeof createApp>

beforeEach(() => {
  db = createDb(':memory:')
  app = createApp(db)
})

function createLink(body: unknown) {
  return app.request('/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createAndRead(body: unknown) {
  const res = await createLink(body)
  return { res, json: (await res.json()) as Record<string, any> }
}

describe('health', () => {
  test('GET /api/health mengembalikan status ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

describe('POST /api/links', () => {
  test('URL valid menghasilkan 201 dan kode pendek', async () => {
    const { res, json } = await createAndRead({ url: 'https://example.com/halaman?q=1' })

    expect(res.status).toBe(201)
    expect(typeof json.code).toBe('string')
    expect(json.code).toHaveLength(7)
    expect(json.url).toBe('https://example.com/halaman?q=1')
    expect(json.clicks).toBe(0)
    expect(json.expiresAt).toBeNull()
    expect(json.shortUrl).toContain(`/${json.code}`)
  })

  test('URL tidak valid ditolak dengan 400', async () => {
    for (const url of ['bukan-url', '', 'example.com', 123, null]) {
      const res = await createLink({ url })
      expect(res.status).toBe(400)
    }
  })

  test('protokol selain http/https ditolak', async () => {
    for (const url of ['ftp://example.com/file', 'javascript:alert(1)']) {
      const res = await createLink({ url })
      expect(res.status).toBe(400)
    }
  })

  test('body bukan JSON yang valid ditolak dengan 400', async () => {
    const res = await app.request('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ url: ',
    })
    expect(res.status).toBe(400)
  })

  test('alias custom dipakai sebagai kode', async () => {
    const { res, json } = await createAndRead({ url: 'https://example.com', alias: 'blog-saya' })

    expect(res.status).toBe(201)
    expect(json.code).toBe('blog-saya')
    expect((await app.request('/api/links/blog-saya')).status).toBe(200)
  })

  test('alias tidak valid ditolak dengan 400', async () => {
    for (const alias of ['ab', 'spasi ada', 'tanda!', 'x'.repeat(33), '']) {
      const res = await createLink({ url: 'https://example.com', alias })
      expect(res.status).toBe(400)
    }
  })

  test('alias yang sudah dipakai menghasilkan 409', async () => {
    await createLink({ url: 'https://example.com/pertama', alias: 'promo' })
    const res = await createLink({ url: 'https://example.com/kedua', alias: 'promo' })

    expect(res.status).toBe(409)
  })

  test('ttlSeconds tidak valid ditolak dengan 400', async () => {
    for (const ttlSeconds of [0, -10, 1.5, '60']) {
      const res = await createLink({ url: 'https://example.com', ttlSeconds })
      expect(res.status).toBe(400)
    }
  })

  test('ttlSeconds mengisi expiresAt di masa depan', async () => {
    const before = Date.now()
    const { res, json } = await createAndRead({ url: 'https://example.com', ttlSeconds: 60 })

    expect(res.status).toBe(201)
    expect(json.expiresAt).toBeGreaterThan(before)
    expect(json.expiresAt).toBeLessThanOrEqual(before + 60_000)
  })
})

describe('GET /:code', () => {
  test('redirect 302 ke URL asli', async () => {
    const { json } = await createAndRead({ url: 'https://example.com/tujuan' })
    const res = await app.request(`/${json.code}`)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://example.com/tujuan')
  })

  test('kode tidak dikenal menghasilkan 404', async () => {
    const res = await app.request('/tidak-ada')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Link not found' })
  })

  test('setiap kunjungan menambah jumlah klik', async () => {
    const { json } = await createAndRead({ url: 'https://example.com' })

    await app.request(`/${json.code}`)
    await app.request(`/${json.code}`)
    await app.request(`/${json.code}`)

    const res = await app.request(`/api/links/${json.code}`)
    const detail = (await res.json()) as Record<string, any>

    expect(detail.clicks).toBe(3)
  })

  test('link kedaluwarsa menghasilkan 410 dan tidak menambah klik', async () => {
    const { json } = await createAndRead({ url: 'https://example.com', ttlSeconds: 60 })
    db.run('UPDATE links SET expires_at = ? WHERE code = ?', [Date.now() - 1000, json.code])

    const res = await app.request(`/${json.code}`)
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'Link expired' })

    const detail = (await (await app.request(`/api/links/${json.code}`)).json()) as any
    expect(detail.clicks).toBe(0)
  })
})

describe('GET /api/links/:code', () => {
  test('mengembalikan detail link', async () => {
    const { json } = await createAndRead({ url: 'https://example.com/detail' })

    const res = await app.request(`/api/links/${json.code}`)
    const detail = (await res.json()) as Record<string, any>

    expect(res.status).toBe(200)
    expect(detail).toEqual({
      code: json.code,
      url: 'https://example.com/detail',
      clicks: 0,
      createdAt: json.createdAt,
      expiresAt: null,
    })
  })

  test('kode tidak dikenal menghasilkan 404', async () => {
    const res = await app.request('/api/links/tidak-ada')
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/links/:code', () => {
  test('menghapus link dan mengembalikan 204', async () => {
    const { json } = await createAndRead({ url: 'https://example.com/hapus' })

    const del = await app.request(`/api/links/${json.code}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const after = await app.request(`/api/links/${json.code}`)
    expect(after.status).toBe(404)
  })

  test('menghapus kode yang tidak ada menghasilkan 404', async () => {
    const res = await app.request('/api/links/tidak-ada', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
