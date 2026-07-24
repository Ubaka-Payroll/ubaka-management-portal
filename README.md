# Ubaka Management Portal

Web portal for Ubaka system administration and site ownership. Design and UI language match the desktop app in `ubaka-payroll-mis`.

## Roles

| Role | Where | Responsibilities |
|------|--------|------------------|
| **System Admin** | This portal | Review site-owner access requests, manage subscriptions, issue activation keys |
| **Site Owner** | This portal | Create Field Engineers, share activation keys, view daily site reports |
| **Field Engineer** | Desktop app | Run site operations (attendance, workers) after activating with a key |

## Stack

- **Frontend:** React 19, Vite, TypeScript, React Router, Lucide (same visual system as desktop)
- **Backend:** Express, JWT auth, file-backed JSON store (`data/db.json`) for v1

## Quick start

```bash
# From repo root
npm run install:all
npm run seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4100  

### Demo logins

Password for all: `password123`

- **Admin:** `admin@ubaka.site`
- **Site owner:** `owner@demo.site`

## Main flows (v1)

1. Visitor submits **Request access** as a prospective Site Owner  
2. System Admin **approves** → owner account + subscription seats + activation keys  
3. Site Owner **creates Field Engineers** and shares an activation key  
4. Site Owner **views daily reports** synced from the desktop app (sample data seeded for demo)

## Project layout

```
ubaka-management-portal/
├── backend/          # Express API
├── frontend/         # React portal
└── data/db.json      # Local data store (created by seed)
```

## Later

- Wire report ingest from the desktop backend  
- PostgreSQL instead of JSON file  
- Payments / billing for subscriptions  
- Engineer self-activation endpoint used by the desktop app
