export type Role = 'SYSTEM_ADMIN' | 'SITE_OWNER' | 'FIELD_ENGINEER'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEACTIVATED'
export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
export type EngineerStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'DISABLED'

export interface User {
  id: string
  email: string
  passwordHash: string
  fullName: string
  role: Role
  companyName?: string
  phone?: string
  createdAt: string
}

export interface OwnerRequest {
  id: string
  fullName: string
  email: string
  companyName: string
  phone: string
  message?: string
  status: RequestStatus
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
}

export interface Subscription {
  id: string
  ownerId: string
  status: SubscriptionStatus
  planName: string
  seats: number
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

export interface ActivationKey {
  id: string
  key: string
  ownerId: string
  engineerId?: string
  siteName?: string
  status: 'AVAILABLE' | 'ASSIGNED' | 'USED' | 'REVOKED'
  createdAt: string
  usedAt?: string
}

export interface FieldEngineer {
  id: string
  ownerId: string
  fullName: string
  email: string
  phone?: string
  siteName: string
  status: EngineerStatus
  activationKeyId?: string
  userId?: string
  createdAt: string
  activatedAt?: string
}

export interface DailyReportRow {
  worker_id: number
  worker_number: string
  full_name: string
  classification: string
  entry_time: string | null
  exit_time: string | null
  break_count: number
  break_minutes: number | null
  hours_worked: number | null
  daily_wage: number | null
}

export interface DailyReport {
  id: string
  ownerId: string
  engineerId: string
  siteName: string
  reportDate: string
  workersPresent: number
  completedShifts: number
  activeOnSite: number
  totalWages: number
  rows: DailyReportRow[]
  receivedAt: string
}

export interface Database {
  users: User[]
  ownerRequests: OwnerRequest[]
  subscriptions: Subscription[]
  activationKeys: ActivationKey[]
  fieldEngineers: FieldEngineer[]
  dailyReports: DailyReport[]
}
