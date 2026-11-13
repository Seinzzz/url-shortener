# Kontrak API

Spesifikasi kontrak API. `tests/links.test.ts` menguji kontrak ini.

## `GET /api/health`

```json
200 {"status":"ok"}
```

## `POST /api/links`

Body JSON:

| Field        | Tipe    | Wajib | Aturan                                                                      |
| ------------ | ------- | ----- | --------------------------------------------------------------------------- |
| `url`        | string  | ya    | harus bisa di-parse, protokol `http:` atau `https:`, maksimal 2048 karakter |
| `alias`      | string  | tidak | 3-32 karakter, hanya `A-Z a-z 0-9 - _`                                      |
| `ttlSeconds` | integer | tidak | bilangan bulat > 0. Link kedaluwarsa setelah N detik                        |

Sukses:

```json
201 {
  "code": "aB3xY9z",
  "url": "https://example.com/halaman",
  "shortUrl": "http://localhost:3000/aB3xY9z",
  "clicks": 0,
  "createdAt": 1761700000000,
  "expiresAt": null
}
```

- `code` = `alias` kalau dikirim, kalau tidak dibuat acak 7 karakter.
- `expiresAt` = `null` kalau `ttlSeconds` tidak dikirim, selain itu timestamp milidetik.
- `clicks` selalu mulai dari `0`.

Error:

| Status | Kondisi                           |
| ------ | --------------------------------- |
| 400    | `url` tidak valid                 |
| 400    | `alias` tidak valid               |
| 400    | `ttlSeconds` tidak valid          |
| 400    | body bukan JSON object yang valid |
| 409    | `alias` sudah dipakai link lain   |

## `GET /:code`

| Status | Kondisi                                            |
| ------ | -------------------------------------------------- |
| 302    | ada dan belum kedaluwarsa → `Location: <url asli>` |
| 404    | kode tidak ada → `{"error":"Link not found"}`      |
| 410    | sudah kedaluwarsa → `{"error":"Link expired"}`     |

Setiap kunjungan yang berhasil (302) menambah `clicks` sebanyak 1.
Kunjungan ke link kedaluwarsa **tidak** menambah klik.

## `GET /api/links/:code`

```json
200 {
  "code": "aB3xY9z",
  "url": "https://example.com/halaman",
  "clicks": 3,
  "createdAt": 1761700000000,
  "expiresAt": null
}
```

`404` kalau kode tidak ada.

## `DELETE /api/links/:code`

- `204` tanpa body kalau berhasil dihapus.
- `404` kalau kode tidak ada.

## Aturan umum

- Semua error memakai bentuk `{"error": "..."}`.
- Route yang tidak dikenal → `404 {"error":"Not found"}` (sudah diatur di `app.ts`).
