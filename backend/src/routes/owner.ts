import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { readDb, updateDb } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireRole('SITE_OWNER'))

router.get('/overview', (req, res) => {
  const ownerId = req.user!.id
  const db = readDb()
  const subscription = db.subscriptions.find((s) => s.ownerId === ownerId) || null
  const engineers = db.fieldEngineers.filter((e) => e.ownerId === ownerId)
  const keys = db.activationKeys.filter((k) => k.ownerId === ownerId)
  const reports = db.dailyReports
    .filter((r) => r.ownerId === ownerId)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))

  const latest = reports[0] || null

  return res.json({
    subscription,
    engineerCount: engineers.length,
    activeEngineers: engineers.filter((e) => e.status === 'ACTIVE').length,
    keysAvailable: keys.filter((k) => k.status === 'AVAILABLE').length,
    keysUsed: keys.filter((k) => k.status === 'USED').length,
    latestReport: latest,
    recentReports: reports.slice(0, 7),
  })
})

router.get('/engineers', (req, res) => {
  const ownerId = req.user!.id
  const db = readDb()
  const engineers = db.fieldEngineers
    .filter((e) => e.ownerId === ownerId)
    .map((e) => {
      const key = db.activationKeys.find((k) => k.id === e.activationKeyId)
      return { ...e, activationKey: key?.key ?? null }
    })
  return res.json(engineers)
})

router.post('/engineers', (req, res) => {
  const ownerId = req.user!.id
  const { fullName, email, phone, siteName } = req.body as {
    fullName?: string
    email?: string
    phone?: string
    siteName?: string
  }

  if (!fullName || !email || !siteName) {
    return res.status(400).json({ error: 'Full name, email, and site name are required' })
  }

  const db = readDb()
  const subscription = db.subscriptions.find((s) => s.ownerId === ownerId)
  if (!subscription || subscription.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Active subscription required to create engineers' })
  }

  const availableKey = db.activationKeys.find((k) => k.ownerId === ownerId && k.status === 'AVAILABLE')
  if (!availableKey) {
    return res.status(400).json({
      error: 'No available activation keys. Ask System Admin to issue more seats.',
    })
  }

  const duplicate = db.fieldEngineers.find(
    (e) => e.ownerId === ownerId && e.email.toLowerCase() === email.toLowerCase(),
  )
  if (duplicate) {
    return res.status(409).json({ error: 'An engineer with this email already exists' })
  }

  const now = new Date().toISOString()
  const engineer = {
    id: uuid(),
    ownerId,
    fullName,
    email,
    phone,
    siteName,
    status: 'PENDING_ACTIVATION' as const,
    activationKeyId: availableKey.id,
    createdAt: now,
  }

  updateDb((store) => {
    store.fieldEngineers.push(engineer)
    const key = store.activationKeys.find((k) => k.id === availableKey.id)!
    key.status = 'ASSIGNED'
    key.engineerId = engineer.id
    key.siteName = siteName
  })

  return res.status(201).json({
    ...engineer,
    activationKey: availableKey.key,
    message: 'Share the activation key with the Field Engineer to unlock the desktop app.',
  })
})

router.get('/keys', (req, res) => {
  const ownerId = req.user!.id
  const db = readDb()
  const keys = db.activationKeys
    .filter((k) => k.ownerId === ownerId)
    .map((k) => {
      const engineer = db.fieldEngineers.find((e) => e.id === k.engineerId)
      return {
        ...k,
        engineerName: engineer?.fullName ?? null,
        engineerEmail: engineer?.email ?? null,
      }
    })
  return res.json(keys)
})

router.get('/reports', (req, res) => {
  const ownerId = req.user!.id
  const db = readDb()
  const reports = db.dailyReports
    .filter((r) => r.ownerId === ownerId)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .map(({ rows, ...meta }) => meta)
  return res.json(reports)
})

router.get('/reports/:id', (req, res) => {
  const ownerId = req.user!.id
  const db = readDb()
  const report = db.dailyReports.find((r) => r.id === req.params.id && r.ownerId === ownerId)
  if (!report) return res.status(404).json({ error: 'Report not found' })
  return res.json(report)
})

export default router
