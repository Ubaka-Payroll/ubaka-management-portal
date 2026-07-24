import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import ownerRoutes from './routes/owner.js'
import { readDb } from './db.js'
import { openapiSpec } from './openapi.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR
  ? path.resolve(__dirname, '..', process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data')

if (!fs.existsSync(path.join(dataDir, 'db.json'))) {
  console.warn('No database found. Run: npm run seed')
}

const app = express()
const port = Number(process.env.PORT || 4100)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  const db = readDb()
  res.json({
    ok: true,
    service: 'ubaka-management-portal',
    users: db.users.length,
  })
})

app.get('/api/openapi.json', (_req, res) => {
  res.json(openapiSpec)
})

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Ubaka Management Portal API',
  }),
)

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/owner', ownerRoutes)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(port, () => {
  console.log(`Ubaka Management Portal API listening on http://localhost:${port}`)
})
