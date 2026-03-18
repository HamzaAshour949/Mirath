import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db'
import { activateRouter } from './routes/activate'
import { statusRouter } from './routes/status'

const app = express()
const PORT = process.env['PORT'] ?? 3001

app.use(cors())
app.use(express.json())

app.use('/activate', activateRouter)
app.use('/license', statusRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

initDb()

app.listen(PORT, () => {
  console.log(`license-server running on port ${PORT}`)
})
