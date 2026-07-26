import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { readDb, updateDb } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import type { ActivationKey } from '../types.js'

const router = Router()

router.use(requireAuth, requireRole('SYSTEM_ADMIN'))

function makeKey() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `UBAKA-${chunk()}-${chunk()}-${chunk()}`
}

router.get('/overview', (_req, res) => {
  const db = readDb()
  const pendingRequests = db.ownerRequests.filter((r) => r.status === 'PENDING').length
  const owners = db.users.filter((u) => u.role === 'SITE_OWNER').length
  const activeSubs = db.subscriptions.filter((s) => s.status === 'ACTIVE').length
  const engineers = db.fieldEngineers.length
  const keysAvailable = db.activationKeys.filter((k) => k.status === 'AVAILABLE').length

  return res.json({
    pendingRequests,
    owners,
    activeSubs,
    engineers,
    keysAvailable,
    recentRequests: db.ownerRequests.slice(0, 5),
    subscriptions: db.subscriptions.map((s) => {
      const owner = db.users.find((u) => u.id === s.ownerId)
      return {
        ...s,
        ownerName: owner?.fullName,
        ownerEmail: owner?.email,
        companyName: owner?.companyName,
      }
    }),
  })
})

router.get('/requests', (_req, res) => {
  const db = readDb()
  return res.json(db.ownerRequests)
})

router.post('/requests/:id/approve', async (req, res) => {
  const { id } = req.params
  const seats = Number(req.body?.seats ?? 3)
  const planName = (req.body?.planName as string) || 'Site Standard'
  const db = readDb()
  const request = db.ownerRequests.find((r) => r.id === id)

  if (!request) return res.status(404).json({ error: 'Request not found' })
  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: 'Request is not pending' })
  }

  const tempPassword = 'welcome123'
  const passwordHash = await bcrypt.hash(tempPassword, 10)
  const ownerId = uuid()
  const now = new Date().toISOString()

  const keys: ActivationKey[] = Array.from({ length: seats }, () => ({
    id: uuid(),
    key: makeKey(),
    ownerId,
    status: 'AVAILABLE',
    createdAt: now,
  }))

  updateDb((store) => {
    const reqItem = store.ownerRequests.find((r) => r.id === id)!
    reqItem.status = 'APPROVED'
    reqItem.reviewedBy = req.user!.id
    reqItem.reviewedAt = now

    store.users.push({
      id: ownerId,
      email: request.email,
      passwordHash,
      fullName: request.fullName,
      role: 'SITE_OWNER',
      companyName: request.companyName,
      phone: request.phone,
      createdAt: now,
    })

    store.subscriptions.push({
      id: uuid(),
      ownerId,
      status: 'ACTIVE',
      planName,
      seats,
      startsAt: now,
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      createdAt: now,
    })

    store.activationKeys.push(...keys)
  })

  return res.json({
    message: 'Site owner approved and account created',
    temporaryPassword: tempPassword,
    activationKeys: keys.map((k) => k.key),
  })
})

router.post('/requests/:id/reject', (req, res) => {
  const { id } = req.params
  const reason = (req.body?.reason as string) || 'Not approved at this time'
  const db = readDb()
  const request = db.ownerRequests.find((r) => r.id === id)
  if (!request) return res.status(404).json({ error: 'Request not found' })
  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: 'Request is not pending' })
  }

  updateDb((store) => {
    const reqItem = store.ownerRequests.find((r) => r.id === id)!
    reqItem.status = 'REJECTED'
    reqItem.reviewedBy = req.user!.id
    reqItem.reviewedAt = new Date().toISOString()
    reqItem.rejectionReason = reason
  })

  return res.json({ message: 'Request rejected' })
})

router.patch('/requests/:id', (req, res) => {
  const { id } = req.params
  const { fullName, email, companyName, phone, message } = req.body as {
    fullName?: string
    email?: string
    companyName?: string
    phone?: string
    message?: string
  }

  const db = readDb()
  const request = db.ownerRequests.find((r) => r.id === id)
  if (!request) return res.status(404).json({ error: 'Request not found' })

  if (!fullName?.trim() || !email?.trim() || !companyName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Full name, email, company, and phone are required' })
  }

  const emailTaken = db.ownerRequests.find(
    (r) => r.id !== id && r.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (emailTaken) {
    return res.status(409).json({ error: 'Another request already uses this email' })
  }

  const previousEmail = request.email

  updateDb((store) => {
    const reqItem = store.ownerRequests.find((r) => r.id === id)!
    reqItem.fullName = fullName.trim()
    reqItem.email = email.trim()
    reqItem.companyName = companyName.trim()
    reqItem.phone = phone.trim()
    reqItem.message = message?.trim() || undefined

    if (reqItem.status === 'APPROVED') {
      const owner = store.users.find(
        (u) => u.role === 'SITE_OWNER' && u.email.toLowerCase() === previousEmail.toLowerCase(),
      )
      if (owner) {
        owner.fullName = reqItem.fullName
        owner.email = reqItem.email
        owner.companyName = reqItem.companyName
        owner.phone = reqItem.phone
      }
    }
  })

  return res.json({ message: 'Request updated' })
})

router.delete('/requests/:id', (req, res) => {
  const { id } = req.params
  const db = readDb()
  const request = db.ownerRequests.find((r) => r.id === id)
  if (!request) return res.status(404).json({ error: 'Request not found' })

  updateDb((store) => {
    store.ownerRequests = store.ownerRequests.filter((r) => r.id !== id)
  })

  return res.json({ message: 'Request deleted' })
})

router.post('/requests/:id/deactivate', (req, res) => {
  const { id } = req.params
  const db = readDb()
  const request = db.ownerRequests.find((r) => r.id === id)
  if (!request) return res.status(404).json({ error: 'Request not found' })
  if (request.status === 'DEACTIVATED') {
    return res.status(400).json({ error: 'Request is already deactivated' })
  }
  if (request.status === 'REJECTED') {
    return res.status(400).json({ error: 'Rejected requests cannot be deactivated' })
  }

  const now = new Date().toISOString()

  updateDb((store) => {
    const reqItem = store.ownerRequests.find((r) => r.id === id)!
    const wasApproved = reqItem.status === 'APPROVED'
    reqItem.status = 'DEACTIVATED'
    reqItem.reviewedBy = req.user!.id
    reqItem.reviewedAt = now

    if (wasApproved) {
      const owner = store.users.find(
        (u) => u.role === 'SITE_OWNER' && u.email.toLowerCase() === reqItem.email.toLowerCase(),
      )
      if (owner) {
        const sub = store.subscriptions.find((s) => s.ownerId === owner.id)
        if (sub) sub.status = 'SUSPENDED'
      }
    }
  })

  return res.json({ message: 'Request deactivated' })
})

router.get('/subscriptions', (_req, res) => {
  const db = readDb()
  const rows = db.subscriptions.map((s) => {
    const owner = db.users.find((u) => u.id === s.ownerId)
    const keys = db.activationKeys.filter((k) => k.ownerId === s.ownerId)
    return {
      ...s,
      ownerName: owner?.fullName,
      ownerEmail: owner?.email,
      companyName: owner?.companyName,
      keysIssued: keys.length,
      keysUsed: keys.filter((k) => k.status === 'USED').length,
    }
  })
  return res.json(rows)
})

router.post('/subscriptions/:ownerId/keys', (req, res) => {
  const { ownerId } = req.params
  const count = Math.min(Number(req.body?.count ?? 1), 20)
  const db = readDb()
  const owner = db.users.find((u) => u.id === ownerId && u.role === 'SITE_OWNER')
  if (!owner) return res.status(404).json({ error: 'Site owner not found' })

  const now = new Date().toISOString()
  const keys: ActivationKey[] = Array.from({ length: count }, () => ({
    id: uuid(),
    key: makeKey(),
    ownerId,
    status: 'AVAILABLE',
    createdAt: now,
  }))

  updateDb((store) => {
    store.activationKeys.push(...keys)
    const sub = store.subscriptions.find((s) => s.ownerId === ownerId)
    if (sub) sub.seats = Math.max(sub.seats, store.activationKeys.filter((k) => k.ownerId === ownerId).length)
  })

  return res.status(201).json({ keys: keys.map((k) => k.key) })
})

router.patch('/subscriptions/:id/status', (req, res) => {
  const { id } = req.params
  const status = req.body?.status as string
  if (!['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const db = readDb()
  const sub = db.subscriptions.find((s) => s.id === id)
  if (!sub) return res.status(404).json({ error: 'Subscription not found' })

  updateDb((store) => {
    const item = store.subscriptions.find((s) => s.id === id)!
    item.status = status as typeof item.status
  })

  return res.json({ message: 'Subscription updated' })
})

export default router
