import { createApp } from './app'
import { createDb } from './db'

const db = createDb(process.env.DB_PATH ?? 'links.db')
const app = createApp(db)

const port = Number(process.env.PORT ?? 3000)

console.log(`URL shortener running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
