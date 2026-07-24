import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { writeDb } from './db.js'
import type { Database, DailyReport } from './types.js'

function yesterdayIso() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)
  const now = new Date().toISOString()

  const adminId = uuid()
  const ownerId = uuid()
  const engineerRecordId = uuid()
  const engineerUserId = uuid()
  const keyId = uuid()
  const subId = uuid()

  const sampleReport: DailyReport = {
    id: uuid(),
    ownerId,
    engineerId: engineerRecordId,
    siteName: 'Kigali Heights Site A',
    reportDate: yesterdayIso(),
    workersPresent: 4,
    completedShifts: 2,
    activeOnSite: 2,
    totalWages: 46800,
    receivedAt: now,
    rows: [
      {
        worker_id: 1,
        worker_number: 'W-001',
        full_name: 'Jean Uwimana',
        classification: 'Mason',
        entry_time: `${yesterdayIso()}T07:02:00.000Z`,
        exit_time: `${yesterdayIso()}T16:05:00.000Z`,
        break_count: 1,
        break_minutes: 45,
        hours_worked: 8.3,
        daily_wage: 12450,
      },
      {
        worker_id: 2,
        worker_number: 'W-002',
        full_name: 'Alice Mukamana',
        classification: 'Carpenter',
        entry_time: `${yesterdayIso()}T07:15:00.000Z`,
        exit_time: `${yesterdayIso()}T15:55:00.000Z`,
        break_count: 1,
        break_minutes: 30,
        hours_worked: 8.1,
        daily_wage: 12150,
      },
      {
        worker_id: 3,
        worker_number: 'W-003',
        full_name: 'Eric Niyonzima',
        classification: 'Laborer',
        entry_time: `${yesterdayIso()}T07:08:00.000Z`,
        exit_time: null,
        break_count: 0,
        break_minutes: 0,
        hours_worked: 6.5,
        daily_wage: 9750,
      },
      {
        worker_id: 4,
        worker_number: 'W-004',
        full_name: 'Grace Ingabire',
        classification: 'Electrician',
        entry_time: `${yesterdayIso()}T08:00:00.000Z`,
        exit_time: null,
        break_count: 1,
        break_minutes: 20,
        hours_worked: 5.7,
        daily_wage: 12450,
      },
    ],
  }

  const db: Database = {
    users: [
      {
        id: adminId,
        email: 'admin@ubaka.site',
        passwordHash,
        fullName: 'System Admin',
        role: 'SYSTEM_ADMIN',
        createdAt: now,
      },
      {
        id: ownerId,
        email: 'owner@demo.site',
        passwordHash,
        fullName: 'Patrice Habimana',
        role: 'SITE_OWNER',
        companyName: 'Habimana Construction Ltd',
        phone: '+250788000111',
        createdAt: now,
      },
      {
        id: engineerUserId,
        email: 'engineer@demo.site',
        passwordHash,
        fullName: 'Claudine Uwase',
        role: 'FIELD_ENGINEER',
        phone: '+250788000222',
        createdAt: now,
      },
    ],
    ownerRequests: [
      {
        id: uuid(),
        fullName: 'Diane Uwera',
        email: 'diane@buildco.rw',
        companyName: 'BuildCo Rwanda',
        phone: '+250788000333',
        message: 'We manage 3 construction sites in Kigali and need Ubaka for attendance.',
        status: 'PENDING',
        createdAt: now,
      },
    ],
    subscriptions: [
      {
        id: subId,
        ownerId,
        status: 'ACTIVE',
        planName: 'Site Standard',
        seats: 5,
        startsAt: now,
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        createdAt: now,
      },
    ],
    activationKeys: [
      {
        id: keyId,
        key: 'UBAKA-DEMO-A1B2-C3D4',
        ownerId,
        engineerId: engineerRecordId,
        siteName: 'Kigali Heights Site A',
        status: 'USED',
        createdAt: now,
        usedAt: now,
      },
      {
        id: uuid(),
        key: 'UBAKA-DEMO-E5F6-G7H8',
        ownerId,
        status: 'AVAILABLE',
        createdAt: now,
      },
    ],
    fieldEngineers: [
      {
        id: engineerRecordId,
        ownerId,
        fullName: 'Claudine Uwase',
        email: 'engineer@demo.site',
        phone: '+250788000222',
        siteName: 'Kigali Heights Site A',
        status: 'ACTIVE',
        activationKeyId: keyId,
        userId: engineerUserId,
        createdAt: now,
        activatedAt: now,
      },
    ],
    dailyReports: [sampleReport],
  }

  writeDb(db)
  console.log('Seeded demo data at data/db.json')
  console.log('Logins (password: password123):')
  console.log('  Admin:    admin@ubaka.site')
  console.log('  Owner:    owner@demo.site')
  console.log('  Engineer: engineer@demo.site')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
