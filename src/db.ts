import { Database } from 'bun:sqlite'

/** A `links` row as stored in SQLite. */
export type LinkRow = {
  code: string
  url: string
  created_at: number
  expires_at: number | null
  clicks: number
}

export type Db = Database

/** Opens (or creates) the database and ensures the `links` table exists. */
export function createDb(path = 'links.db'): Db {
  const db = new Database(path, { create: true })
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      code       TEXT PRIMARY KEY,
      url        TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      clicks     INTEGER NOT NULL DEFAULT 0
    )
  `)
  return db
}
