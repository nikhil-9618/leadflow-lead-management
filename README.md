# LeadFlow — Lead Management System (V2)

A full-stack lead management system built for the **Meru Technosoft Pvt. Ltd. Full Stack Developer** screening assignment, then extended into **LeadFlow V2**: an analytics dashboard, a drag-and-drop sales pipeline, an audit trail, follow-up tasks, rule-based lead scoring, CSV import/export, and a hardened Express API.

Everything is backed by a real MongoDB database. There is no mock data, no frontend-only feature, and no placeholder button.

---

## Table of contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database design](#database-design)
- [API reference](#api-reference)
- [Validation rules](#validation-rules)
- [Lead scoring model](#lead-scoring-model)
- [CSV import and export](#csv-import-and-export)
- [Security measures](#security-measures)
- [Testing](#testing)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)
- [Assignment checklist](#assignment-checklist)

---

## Overview

LeadFlow is a small but complete CRM for tracking sales leads from first contact to qualified opportunity.

**Core workflow**

1. Capture a lead (name, email, phone, company, source) plus optional context such as job title, priority, tags and estimated deal value.
2. Search, filter, sort and page through the pipeline without ever loading the whole collection in the browser.
3. Move leads across stages — **New → Contacted → Qualified → Lost** — from the table or by dragging cards on the Kanban board.
4. Open a lead to read its activity timeline, add notes, schedule the next follow-up and create tasks.
5. Watch the dashboard update from real MongoDB aggregations: stage distribution, source mix, daily volume, monthly acquisition, conversion rate and pipeline value.
6. Export the current view (or just selected rows) to CSV, or bulk-import leads from a CSV with row-level validation.

The original assignment's requirements are all preserved: REST API with the required status codes, server-side search/filter/sort/pagination, MongoDB aggregation for stats, backend + frontend validation, and a responsive UI in the specified palette.

---

## Screenshots

| Dashboard | Dark mode |
| --- | --- |
| ![Dashboard](docs/screenshots/v2-dashboard.png) | ![Dashboard in dark mode](docs/screenshots/v2-dashboard-dark.png) |

| Leads table | Lead details & activity timeline |
| --- | --- |
| ![Leads](docs/screenshots/v2-leads.png) | ![Lead details](docs/screenshots/v2-lead-details.png) |

| Pipeline (drag & drop) | Tasks & follow-ups |
| --- | --- |
| ![Pipeline](docs/screenshots/v2-pipeline.png) | ![Tasks](docs/screenshots/v2-tasks.png) |

| CSV import preview | Delete confirmation |
| --- | --- |
| ![Import preview](docs/screenshots/v2-import-preview.png) | ![Delete confirmation](docs/screenshots/v2-delete-confirm.png) |

| Mobile leads | Mobile navigation |
| --- | --- |
| ![Mobile leads](docs/screenshots/v2-mobile-leads.png) | ![Mobile navigation](docs/screenshots/v2-mobile-nav.png) |

---

## Features

### Lead management
- Create, read, update and delete leads with required-field, email, phone and enum validation on **both** client and server.
- Optional V2 fields: job title, priority (Low/Medium/High), description, tags, estimated value, last-contacted date and next follow-up date.
- Duplicate email prevention backed by a unique index and translated into HTTP `409`.
- Delete confirmation that names the lead being removed; the audit trail survives deletion.
- Duplicate form submissions are blocked while a request is in flight.

### Search, filtering and pagination
- One search box that queries **name, email, phone and company** server-side, case-insensitively.
- Filters for status, source, priority and creation-date range, composable with each other and with search.
- Sorting: newest, oldest, highest score, name A–Z.
- Server-side pagination with page window controls.
- Debounced search (350 ms) with URL-synced state, so a filtered view can be bookmarked or refreshed.
- Active-filter chips plus a one-click reset.

### Dashboard analytics
- Stat cards for total, New, Contacted, Qualified, Lost, created-this-month, conversion rate and pipeline value.
- Charts: leads by status (donut), leads by source (bar), daily creation trend (area), 12-month acquisition (bar).
- Date-range presets (7 / 30 / 90 days, all time) plus a custom range.
- Every number comes from MongoDB aggregation pipelines — nothing is hardcoded, and the dashboard refreshes after CRUD operations.

### Pipeline (Kanban)
- Four stage columns with per-column counts and total estimated value.
- Native drag-and-drop that persists the new status through `PATCH /api/leads/:id/status` and appends an audit entry.
- Optimistic UI with rollback and a toast if the API rejects the move.
- Search, source and priority filters scoped to the board.

### Lead details and activity history
- Contact and deal information, tags, notes and score breakdown.
- Append-only activity timeline: created, updated, status changed, note added, follow-up scheduled, imported, task created/completed, deleted.
- Add notes and schedule follow-ups without leaving the page.
- Related tasks with inline completion.

### Tasks and follow-ups
- Task fields: title, description, related lead, due date, due time, priority, status.
- Statuses: Pending, In Progress, Completed, Cancelled.
- Tabs for All, Today, Upcoming, Overdue and Open with live counters.
- Completing a task records an activity on its lead.
- Deleting a lead detaches its tasks instead of silently deleting them.

### Lead scoring
- Transparent, rule-based score (0–100) with a per-rule breakdown shown in the UI.
- Bands: Cold (0–29), Warm (30–59), Hot (60–100).
- Recalculated automatically whenever a lead is saved. See [Lead scoring model](#lead-scoring-model).

### CSV export and import
- Export **all** leads, the **current filtered** set, or **selected** rows.
- Spreadsheet formula injection is neutralised on export.
- Import validates headers, each row, enum values, dates and duplicates before writing; shows a preview with per-row status and an error report after import.
- 2 MB / 1000-row import guard, enforced on the client and the API.

### UI/UX
- Responsive desktop, tablet and mobile layouts (sidebar collapses to a drawer).
- Light and dark mode, persisted in `localStorage` and following `prefers-color-scheme` on first visit.
- Loading skeletons, empty states, error states with retry, toasts and accessible form controls.
- Palette as specified: `#2563EB` primary, `#F8FAFC` background, white cards/sidebar, `#0F172A` text, `#64748B` muted, `#E2E8F0` borders, with success/warning/danger accents.

---

## Technology stack

**Frontend**
- React 18 + Vite
- JavaScript (no TypeScript)
- Tailwind CSS (class-based dark mode driven by CSS variables)
- React Router DOM
- Axios
- Lucide React icons
- Recharts
- Vitest + React Testing Library

**Backend**
- Node.js + Express 4
- Mongoose 8
- express-validator
- express-rate-limit
- Helmet, CORS, Morgan
- dotenv
- Vitest + Supertest (+ `mongodb-memory-server` for a real, isolated mongod)

**Database**
- MongoDB (local for development, MongoDB Atlas for production)

---

## Architecture

```
┌──────────────────────────┐        ┌───────────────────────────┐        ┌──────────────────┐
│  React SPA (Vite)        │  HTTP  │  Express REST API         │  ODM   │  MongoDB         │
│                          │ ─────▶ │                           │ ─────▶ │                  │
│  pages / components      │  /api  │  routes → validators      │        │  leads           │
│  hooks → services (Axios)│        │        → controllers      │        │  activities      │
│  contexts (theme, toast) │        │        → Mongoose models  │        │  tasks           │
└──────────────────────────┘        └───────────────────────────┘        └──────────────────┘
        │                                      │
        └── dev: Vite proxies /api ────────────┘
            prod: VITE_API_URL points at the deployed API origin
```

**Request flow (write path)**

`route` → `express-validator` rules → validation middleware (`400` with field errors) → controller → Mongoose validation (schema rules + unique index) → audit entry in `activities` → JSON response.

**Error envelope**

Every error, operational or not, leaves the API in the same shape:

```json
{ "success": false, "message": "Human readable message", "errors": [{ "field": "email", "message": "…" }] }
```

Stack traces are only attached when `NODE_ENV=development` and the error is unexpected.

---

## Folder structure

```
.
├── client/                        # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # Modal, Toast, Pagination, badges, skeletons…
│   │   │   ├── dashboard/         # StatCard, ChartCard, Recharts wrappers
│   │   │   ├── layout/            # Sidebar, Navbar, Layout
│   │   │   ├── leads/             # LeadTable, LeadForm, ExportMenu, ImportModal…
│   │   │   ├── pipeline/          # KanbanBoard + drag-and-drop cards
│   │   │   └── tasks/             # TaskForm, TaskItem
│   │   ├── context/               # ThemeContext (light/dark)
│   │   ├── hooks/                 # useLeads, useLeadStats, useTasks, useLeadDetails
│   │   ├── pages/                 # Dashboard, Leads, LeadDetails, Pipeline, Tasks, NotFound
│   │   ├── services/              # Axios instance + lead/task service layer
│   │   ├── utils/                 # date/currency formatting
│   │   ├── validations/           # client-side mirror of the API rules
│   │   ├── test/                  # Vitest setup
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json                # SPA rewrites
│   └── vite.config.js             # dev proxy, preview hosts, Vitest config
├── server/                        # Express API
│   ├── config/                    # db connection, domain constants, scoring rules
│   ├── controllers/               # lead, activity, task, transfer (CSV)
│   ├── middleware/                # validation, errors, 404, ObjectId, sanitise, rate limits
│   ├── models/                    # Lead, Activity, Task
│   ├── routes/                    # health, leads, tasks
│   ├── scripts/                   # backfillScores.js (V1 → V2 upgrade helper)
│   ├── tests/                     # Vitest + Supertest suites
│   ├── utils/                     # ApiError, asyncHandler, csv, scoring, activity
│   ├── validators/                # express-validator rule sets
│   ├── app.js                     # middleware pipeline + route mounting
│   ├── server.js                  # bootstrap, graceful shutdown
│   └── vitest.config.mjs
├── docs/screenshots/              # README images
├── render.yaml                    # Render blueprint for the API
└── README.md
```

---

## Getting started

### Prerequisites
- Node.js 18+ (developed on Node 26)
- npm
- MongoDB running locally, or an Atlas connection string

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure the API

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/leadflow
CLIENT_URL=http://localhost:5173,http://localhost:3000
```

> `CLIENT_URL` is a comma-separated allow-list. Keep it on a single line — dotenv takes the first occurrence of a duplicated key.

### 3. Run the API

```bash
cd server
npm run dev        # nodemon, or: npm start
```

Health check: <http://localhost:5000/api/health>

### 4. Run the SPA

```bash
cd client
cp .env.example .env.local   # VITE_API_URL=/api works with the Vite proxy
npm run dev
```

Open <http://localhost:5173>. In development the browser talks to Vite, which proxies `/api` to `http://localhost:5000`, so there is a single origin and no browser CORS preflight.

To point the SPA straight at a remote API instead, set `VITE_API_URL=https://your-api.example.com/api` (and add the SPA origin to the API's `CLIENT_URL`).

### 5. Upgrade an existing V1 database (optional)

V2 stores a derived `score`/`scoreBand` and new defaults. Re-save existing documents once:

```bash
cd server && npm run backfill:score
```

---

## Environment variables

### `server/.env`

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `5000` | HTTP port (Render injects its own) |
| `NODE_ENV` | no | `development` | Controls logging and stack-trace exposure |
| `MONGODB_URI` | **yes** | `mongodb+srv://…/leadflow` | MongoDB connection string |
| `CLIENT_URL` | **yes** | `http://localhost:5173` | Comma-separated CORS allow-list |

### `client/.env.local`

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | no | `/api` or `https://api.example.com/api` | API base URL baked into the build |

`.env` files are git-ignored; only `.env.example` files are committed.

---

## Database design

### `leads`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–80 chars, trimmed |
| `email` | String | required, valid email, lowercased, ≤254 chars, **unique** |
| `phone` | String | required, 10 digits with optional country code |
| `company` | String | required, 2–120 chars |
| `jobTitle` | String | optional, ≤100 chars |
| `source` | String | required, one of Website, LinkedIn, Referral, Social Media, Advertisement, Other |
| `status` | String | one of New, Contacted, Qualified, Lost (default New) |
| `priority` | String | one of Low, Medium, High (default Medium) |
| `description` | String | optional, ≤2000 chars |
| `tags` | [String] | ≤10 tags, each ≤30 chars |
| `estimatedValue` | Number | 0 – 1,000,000,000 (default 0) |
| `lastContactedAt` | Date | optional |
| `nextFollowUpAt` | Date | optional |
| `notes` | Subdocument[] | `{ text, createdAt }`, append-only through the API |
| `score` / `scoreBand` | Number / String | derived in a `pre('save')` hook |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

Indexes: unique `email`; `createdAt -1`; `status`; `source`; `priority`; `score -1`; `nextFollowUpAt`.

### `activities`

Append-only audit records: `lead` (ObjectId ref), `action` (enum), `description`, `actor`, `metadata`, `createdAt`.

- No update or delete endpoint exists, and a `pre('save')` guard rejects edits to persisted records.
- Records are **kept** when their lead is deleted, so the audit survives (`metadata` keeps name/email/company).

### `tasks`

`title`, `description`, `lead` (nullable ref), `dueDate`, `dueTime` (`HH:mm`), `priority`, `status`, `completedAt`, timestamps.

- Tasks are detached (`lead: null`) when their lead is deleted rather than being destroyed.
- Indexes on `dueDate`, `status`, `lead`, `createdAt`.

**Why email is unique:** the assignment asks not to assume uniqueness silently. It is treated as an explicit business rule of this CRM (one record per contact), enforced by a database index, surfaced as `409 Conflict`, and documented here.

---

## API reference

Base URL: `http://localhost:5000/api`

All responses use `{ success, message?, data?, pagination? }`. Errors additionally include `errors[]` with `{ field, message }` entries.

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Liveness + database state |

```json
{ "success": true, "data": { "status": "ok", "service": "leadflow-api", "version": "2.0.0",
  "environment": "development", "uptime": 12, "database": "connected", "timestamp": "…" } }
```

### Leads

| Method | Endpoint | Description | Status codes |
| --- | --- | --- | --- |
| GET | `/leads` | Paginated list with search, filters, sorting | 200, 400 |
| GET | `/leads/stats` | Dashboard aggregations (optional date range) | 200, 400 |
| GET | `/leads/scoring-rules` | Rule catalogue for explaining scores | 200 |
| GET | `/leads/export` | CSV export (all / filtered / `ids`) | 200, 400, 404 |
| GET | `/leads/:id` | One lead + score breakdown | 200, 400, 404 |
| POST | `/leads` | Create a lead | 201, 400, 409 |
| PUT | `/leads/:id` | Update any subset of fields | 200, 400, 404, 409 |
| PATCH | `/leads/:id/status` | Move a lead to another stage | 200, 400, 404 |
| DELETE | `/leads/:id` | Delete a lead (audit retained) | 200, 404 |
| GET | `/leads/:id/activities` | Activity timeline (newest first) | 200, 400, 404 |
| POST | `/leads/:id/notes` | Append a note | 201, 400, 404 |
| POST | `/leads/import/preview` | Validate a CSV without writing | 200, 400 |
| POST | `/leads/import` | Import valid rows | 201, 200, 400 |

**List query parameters**

| Parameter | Type | Notes |
| --- | --- | --- |
| `search` | string | ≤100 chars, matched against name/email/phone/company (regex-escaped) |
| `status` | enum | New, Contacted, Qualified, Lost |
| `source` | enum | Website, LinkedIn, Referral, Social Media, Advertisement, Other |
| `priority` | enum | Low, Medium, High |
| `dateFrom`, `dateTo` | ISO date | Inclusive `createdAt` range |
| `sort` | enum | `newest` (default), `oldest`, `score`, `name` |
| `page` | integer | ≥1 (default 1) |
| `limit` | integer | 1–100 (default 10) |

```bash
curl "http://localhost:5000/api/leads?search=nikhil&status=New&priority=High&page=1&limit=10&sort=newest"
```

**Create a lead**

```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nikhil Sharma",
    "email": "nikhil.sharma@example.com",
    "phone": "+91 9876543210",
    "company": "Meru Technosoft Pvt. Ltd.",
    "source": "Referral",
    "status": "New",
    "priority": "High",
    "tags": ["enterprise", "q3"],
    "estimatedValue": 250000,
    "nextFollowUpAt": "2026-12-01"
  }'
```

`201 Created`

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "6b001fb45649a73ba3d35327",
    "name": "Nikhil Sharma",
    "email": "nikhil.sharma@example.com",
    "status": "New",
    "priority": "High",
    "score": 45,
    "scoreBand": "Warm",
    "scoreBreakdown": [ { "key": "validEmail", "label": "Valid email address", "points": 10, "earned": true, "awarded": 10 } ]
  }
}
```

**Stats response (abridged)**

```json
{
  "success": true,
  "data": {
    "total": 11, "new": 2, "contacted": 4, "qualified": 4, "lost": 1,
    "createdThisMonth": 6, "conversionRate": 36.4, "totalEstimatedValue": 995000,
    "charts": {
      "byStatus": [{ "name": "New", "value": 2 }, { "name": "Contacted", "value": 4 }],
      "bySource": [{ "name": "Website", "value": 3 }],
      "dailyTrend": [{ "date": "2026-11-01", "count": 1 }],
      "monthlyTrend": [{ "month": "2026-11", "count": 6 }]
    },
    "recentLeads": []
  }
}
```

### Tasks

| Method | Endpoint | Description | Status codes |
| --- | --- | --- | --- |
| GET | `/tasks` | List with `scope=all\|today\|upcoming\|overdue\|open` + counters | 200, 400 |
| GET | `/tasks/:id` | One task | 200, 400, 404 |
| POST | `/tasks` | Create | 201, 400 |
| PUT | `/tasks/:id` | Update | 200, 400, 404 |
| PATCH | `/tasks/:id/complete` | Complete (`{ "completed": true }`) or reopen | 200, 400, 404 |
| DELETE | `/tasks/:id` | Delete | 200, 404 |

### Status codes used

`200` OK · `201` Created · `400` Validation error · `404` Not found · `409` Duplicate email · `429` Rate limited · `500` Unexpected server error.

---

## Validation rules

| Field | Rule |
| --- | --- |
| name | required, 2–80 characters |
| email | required, valid address, ≤254 characters, normalised to lowercase, unique |
| phone | required, 10 digits, optional 1–3 digit country prefix (`+91 9876543210`, `+91-9876543210`, `9876543210`) |
| company | required, 2–120 characters |
| source | required enum |
| status | optional enum, defaults to New |
| priority | optional enum, defaults to Medium |
| jobTitle | optional, ≤100 characters |
| description | optional, ≤2000 characters |
| tags | optional array, ≤10 items, each ≤30 characters |
| estimatedValue | optional number, 0 – 1,000,000,000 |
| lastContactedAt / nextFollowUpAt | optional valid date |
| task title | required, 2–120 characters |
| task due date | required, valid date |
| task due time | optional `HH:mm` |
| query parameters | each allow-listed, typed and range-checked |

The client mirrors these rules for instant feedback, but the API re-validates everything: **frontend validation is never trusted**.

---

## Lead scoring model

Deterministic heuristics — **not** AI or machine learning. Every rule is inspectable via `GET /api/leads/scoring-rules` and shown per lead in the UI.

| Rule | Points |
| --- | --- |
| Valid email address | +10 |
| Phone number available | +5 |
| Company available | +5 |
| Referral source | +10 |
| Qualified status | +20 |
| High priority | +15 |
| Estimated value captured | +10 |
| Next follow-up scheduled | +5 |

Total is clamped to 0–100.

| Score | Band |
| --- | --- |
| 0–29 | Cold |
| 30–59 | Warm |
| 60–100 | Hot |

The score is recalculated in a Mongoose `pre('save')` hook, so it stays correct after API updates, pipeline drags and CSV imports. Rules live in `server/config/scoringRules.js`, so the model is easy to tune in one place.

---

## CSV import and export

**Export** (`GET /api/leads/export`)

- Modes: all leads, the active filter set, or `ids=…` for selected rows.
- Columns: `name,email,phone,company,source,status,priority,jobTitle,description,tags,estimatedValue,lastContactedAt,nextFollowUpAt`.
- UTF-8 with BOM so Excel renders names correctly; `Content-Disposition` sets the filename; `X-Total-Count` reports the row count.
- **Formula injection protection:** cells starting with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` so spreadsheets treat them as text. Import strips that guard, so a `+91…` phone number round-trips intact.

**Import** (`POST /api/leads/import/preview`, then `POST /api/leads/import`)

1. Headers are normalised (`Job Title`, `job_title`, `jobtitle` all map to the same column).
2. Required headers: `name,email,phone,company,source`. Unknown columns are reported and ignored.
3. Each row is normalised (trim, lowercase email, enum case-insensitive, tags split on `;`/`|`, dates parsed) and validated with the **same Mongoose schema** used by the API.
4. Duplicates are detected against the database and within the file.
5. The preview reports `valid`, `invalid` and `duplicate` per row with messages; nothing is written.
6. Confirming imports only the valid rows and returns `{ imported, skipped, failed[] }` plus an activity entry per imported lead.
7. Limits: 2 MB and 1000 rows, enforced client-side and by the API.

---

## Security measures

| Area | Implementation |
| --- | --- |
| HTTP headers | Helmet (with cross-origin resource policy tuned for an API), `x-powered-by` disabled |
| CORS | Strict allow-list from `CLIENT_URL`; unknown origins get `403`; wildcard rejected in production |
| Rate limiting | 600 requests / 15 min per IP API-wide, 120 / min for mutations, 30 / 15 min for CSV imports |
| Input validation | express-validator rule sets on every route + Mongoose schema validation |
| NoSQL injection | Recursive sanitiser strips `$`-prefixed keys and dotted paths from body/query/params; query strings are allow-listed by type and enum |
| ReDoS | User search input is regex-escaped before building `RegExp`; search length capped |
| ObjectId validation | Malformed ids rejected with `400` before hitting the database |
| Body size | JSON 256 kB, urlencoded 64 kB, CSV text 2 MB on import routes only |
| Errors | Centralised handler; consistent envelope; stack traces only in development |
| Audit integrity | Activities are append-only: no update/delete routes and a save guard rejects edits |
| CSV safety | Formula-injection guard on export; header/row validation and size limits on import |
| Secrets | `.env` files git-ignored; only `.env.example` committed; no credentials in code or logs |
| XSS | React escapes all rendered values; the API returns JSON only; no `dangerouslySetInnerHTML` |
| Query efficiency | Server-side pagination, indexed filters, capped limits, export capped at 5000 rows |

Verified by the automated security suite (NoSQL injection, regex injection, malformed JSON, oversized bodies, CORS rejection, header hardening, audit immutability) — see [Testing](#testing).

---

## Testing

### Backend — Vitest + Supertest + a real `mongod`

```bash
cd server && npm test
```

`mongodb-memory-server` starts an ephemeral MongoDB for each run, so tests never touch development or production data.

**Result: 5 files, 79 tests passing.**

| File | Covers |
| --- | --- |
| `tests/leads.test.js` | health, create, required/invalid fields, duplicate 409, defaults and scoring, list/search (name, email, phone, company), combined filters, date range, sorting, pagination + bounds, stats accuracy, single lead, update subsets, status changes, notes, delete + retained audit, 404s |
| `tests/tasks.test.js` | create with/without lead, validation, unknown lead, scope counts (today/upcoming/overdue/open), lead filter, update, complete/reopen (with activity), delete, lead deletion detaches task |
| `tests/transfer.test.js` | export all/filtered/selected, formula-injection guard, phone round-trip, import preview (valid/invalid/duplicate), missing headers, empty file, header-only file, import commit, nothing-to-import, JSON payload |
| `tests/security.test.js` | NoSQL injection via body and query, regex wildcard search, XSS stored as text, malformed JSON, oversized body, CORS rejection/allow, security headers, unknown route, stack-trace leakage, activity immutability |
| `tests/scoring.test.js` | rule points, band boundaries, 100 cap, rule catalogue endpoint, recalculation on update and pipeline move |

### Frontend — Vitest + React Testing Library

```bash
cd client && npm test
```

**Result: 5 files, 28 tests passing.**

| File | Covers |
| --- | --- |
| `src/validations/leadSchema.test.js` | lead/task validation rules, tags parsing |
| `src/components/leads/LeadForm.test.jsx` | required-field errors, email/phone formats, normalised payload, edit prefill, API error surfaced |
| `src/components/leads/DeleteConfirmation.test.jsx` | lead named in the dialog, confirm/cancel behaviour, progress state |
| `src/components/common/Pagination.test.jsx` | range summary, disabled edges, page change callbacks |
| `src/pages/Leads.test.jsx` | rows render, loading → empty state, debounced search, status/priority filters, sort, error state + retry |

### Production build

```bash
cd client && npm run build
```

Vite production build succeeds (≈774 kB JS / 37 kB CSS; 220 kB gzipped).

### Manual end-to-end verification

Performed against the running stack (real MongoDB, Express, Vite) in a browser:

- Create a lead from the form → toast, row appears, dashboard updates.
- Edit a lead → prefilled form, persisted change, updated score.
- Delete a lead → confirmation names the lead → toast, list refreshes.
- Search (`?search=verification` → 1 result), status filter, combined filters, reset.
- Lead details: note added and persisted after reload, follow-up date persisted after reload, timeline grows.
- Pipeline drag from New → Contacted → toast, column counts change, status persisted.
- Task completion → status badge and toast.
- CSV import: missing-header error, then a two-row preview with one valid and one invalid row.
- Dark mode toggle persists across navigation; mobile 390 px has no horizontal overflow and the nav drawer opens.

---

## Deployment

The repository ships with everything needed for the assignment's target topology: **Vercel (frontend) + Render (backend) + MongoDB Atlas**.

### 1. MongoDB Atlas

1. Create a free M0 cluster.
2. Create a database user with `readWrite` on the app database.
3. Network Access → allow your Render service (or `0.0.0.0/0` while evaluating).
4. Copy the SRV string and add the database name, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority`.

### 2. Render (API)

`render.yaml` describes the service, or create it manually:

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Environment | `NODE_ENV=production`, `MONGODB_URI=<Atlas URI>`, `CLIENT_URL=https://<your-vercel-app>` |

### 3. Vercel (SPA)

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment | `VITE_API_URL=https://<your-render-service>.onrender.com/api` |

`client/vercel.json` rewrites all paths to `index.html` so deep links such as `/leads/:id` work in production.

### Production checklist

- [ ] `NODE_ENV=production` on the API
- [ ] `CLIENT_URL` contains **only** the deployed frontend origin
- [ ] `VITE_API_URL` points at the deployed API (not localhost)
- [ ] Atlas IP allow-list includes Render
- [ ] `/api/health` reports `"database": "connected"`
- [ ] `npm run backfill:score` run once when upgrading an existing V1 database

> The deployment steps above are configuration that is ready to use; this repository does not claim a live deployment unless one is stated in the final hand-off.

---

## Assumptions

1. **Email uniqueness is a business rule** — one CRM record per contact. Enforced by a unique index and returned as `409`.
2. **No authentication** (see limitations). All endpoints are single-tenant within a deployment, and `actor` on activities is recorded as `system`.
3. **Conversion rate** = Qualified ÷ total leads in the selected range.
4. **"Created this month"** counts leads created in the current calendar month within the active date filter.
5. **Dashboard charts are computed from the filtered set**, except the 12-month acquisition chart, which always shows the last 12 months as a trend.
6. **Daily trend** fills gaps with zeros so the chart never misrepresents missing days.
7. **Deleting a lead keeps its audit trail** and detaches (does not delete) its tasks.
8. **Phone validation** accepts Indian-style 10-digit numbers with an optional country code.
9. **Reminders/notifications are not implemented** — no reliable delivery channel was configured, so none is claimed.
10. **CSV import is capped** at 1000 rows / 2 MB per file to keep a single request bounded.

---

## Known limitations

- **No authentication or role-based access control.** This was optional in the brief and intentionally deferred rather than half-implemented. All endpoints are public within a deployment; a production CRM must add JWT auth, ownership checks and admin/sales roles.
- **No email/SMS notifications.** Follow-ups are recorded and surfaced in the Tasks view, but no reminder is delivered — there is no configured delivery provider.
- **Kanban board renders up to 100 leads** (newest first) with filters; deeper pipelines should use the searchable leads table.
- **Scoring rules are server-side constants**, tunable in code but not yet editable in the UI.
- **Tasks are not paginated beyond 100 per page** in the API, though the UI requests 50.
- **CSV import is synchronous**; very large datasets would need a background job.
- **No real-time collaboration.** Two users editing the same lead see the other's change only after a refetch.

---

## Future improvements

1. JWT authentication with refresh tokens, bcrypt hashing, Admin/Sales roles and per-owner query scoping.
2. Delivery for reminders (email/queue) plus a notification centre.
3. Saved views and shareable filter presets.
4. Editable scoring rules with per-account weights.
5. Bulk actions (bulk stage change, bulk delete) alongside the existing selection export.
6. Attachment uploads on leads (with file-type/size validation).
7. Optimistic concurrency (`version`) to detect conflicting edits.
8. E2E coverage with Playwright for drag-and-drop and import in CI.
9. Virtualised tables and server-side CSV export streaming for very large datasets.
10. Docker Compose for one-command local startup.

---

## Assignment checklist

| Requirement | Status |
| --- | --- |
| React + Vite + JavaScript + Tailwind + Router + Axios + Lucide | ✅ |
| Node + Express + Mongoose + MongoDB | ✅ |
| dotenv, express-validator, Helmet, CORS, Morgan, express-rate-limit | ✅ |
| All required endpoints (`/health`, `/leads`, `/leads/stats`, `/leads/:id`, CRUD) | ✅ |
| Correct status codes (200/201/400/404/409/429/500) | ✅ |
| Dashboard stats from MongoDB aggregation, never hardcoded | ✅ |
| Search by name/email/phone/company, server-side and case-insensitive | ✅ |
| Status + source + priority + date filters, combined | ✅ |
| Pagination and newest/oldest sorting | ✅ |
| Add / view / edit / delete leads, with confirmation | ✅ |
| Frontend **and** backend validation | ✅ |
| Responsive UI in the specified palette | ✅ |
| Pipeline (Kanban) with persisted drag-and-drop | ✅ |
| Activity history in a separate collection, append-only | ✅ |
| Tasks and follow-ups backed by MongoDB | ✅ |
| Rule-based lead scoring with explanation | ✅ |
| CSV export (all/filtered/selected) and validated import | ✅ |
| Light and dark mode | ✅ |
| Loading skeletons, empty states, error states, toasts | ✅ |
| Backend tests, frontend tests, security tests | ✅ 79 + 28 passing |
| README, `.env.example` files, `.env` ignored | ✅ |
| Production build succeeds | ✅ |
| Deployment configuration for Vercel + Render + Atlas | ✅ (configuration) |

---

Built by **Nikhil** as the Meru Technosoft Full Stack Developer assignment submission.
