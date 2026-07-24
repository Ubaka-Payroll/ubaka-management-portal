import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { readDb, updateDb } from '../db.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const db = readDb()
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const authUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  }

  return res.json({
    token: signToken(authUser),
    user: {
      ...authUser,
      companyName: user.companyName,
      phone: user.phone,
    },
  })
})

router.post('/request-access', (req, res) => {
  const { fullName, email, companyName, phone, message } = req.body as {
    fullName?: string
    email?: string
    companyName?: string
    phone?: string
    message?: string
  }

  if (!fullName || !email || !companyName || !phone) {
    return res.status(400).json({ error: 'Full name, email, company, and phone are required' })
  }

  const db = readDb()
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const pending = db.ownerRequests.find(
    (r) => r.email.toLowerCase() === email.toLowerCase() && r.status === 'PENDING',
  )
  if (pending) {
    return res.status(409).json({ error: 'A request with this email is already pending' })
  }

  const request = {
    id: uuid(),
    fullName,
    email,
    companyName,
    phone,
    message,
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
  }

  updateDb((store) => {
    store.ownerRequests.unshift(request)
  })

  return res.status(201).json({
    message: 'Request submitted. A System Admin will review it shortly.',
    request: { id: request.id, status: request.status },
  })
})

router.get('/me', requireAuth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.user!.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  return res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    companyName: user.companyName,
    phone: user.phone,
  })
})

export default router
