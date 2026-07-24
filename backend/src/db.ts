import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Database } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dataDir = process.env.DATA_DIR
  ? path.resolve(__dirname, '..', process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data')

const dbPath = path.join(dataDir, 'db.json')

const emptyDb = (): Database => ({
  users: [],
  ownerRequests: [],
  subscriptions: [],
  activationKeys: [],
  fieldEngineers: [],
  dailyReports: [],
})

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(emptyDb(), null, 2))
  }
}

export function readDb(): Database {
  ensureStore()
  const raw = fs.readFileSync(dbPath, 'utf8')
  return JSON.parse(raw) as Database
}

export function writeDb(db: Database) {
  ensureStore()
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

export function updateDb(mutator: (db: Database) => void): Database {
  const db = readDb()
  mutator(db)
  writeDb(db)
  return db
}
