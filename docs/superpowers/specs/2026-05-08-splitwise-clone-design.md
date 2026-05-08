# Splitwise Clone — Design Spec

**Date:** 2026-05-08  
**Status:** Approved

---

## Overview

A web application for splitting expenses between friends. Users create groups, add expenses, and the app calculates who owes whom. Payments happen outside the app (Bit / PayBox). The app provides real-time updates via WebSockets when group members add or settle expenses.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, TypeScript |
| State | React Query (server state) + Zustand (UI state) |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Real-time (client) | Socket.io-client |
| Backend | Node.js + Express + TypeScript |
| Real-time (server) | Socket.io |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis (sessions, rate limiting) |
| Auth | JWT (access + refresh tokens) + Google OAuth 2.0 |
| Validation | Zod |
| Email | Nodemailer |
| Currency | ExchangeRate API (cached daily) |
| OAuth | Passport.js (Google strategy) |
| File upload | Cloudinary (receipt images) |
| Monorepo structure | `client/`, `server/`, `shared/` |

---

## Repository Structure

```
split/
├── client/               # React app
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # Route-level pages
│       ├── hooks/        # Custom React hooks
│       └── lib/          # API client, socket, utils
├── server/               # Express app
│   └── src/
│       ├── routes/       # REST API routes
│       ├── services/     # Business logic
│       ├── socket/       # Socket.io handlers
│       └── prisma/       # Schema + migrations
└── shared/               # Shared TypeScript types
```

---

## Data Model

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | |
| email | VARCHAR UNIQUE | |
| password_hash | VARCHAR? | null for OAuth-only users |
| google_id | VARCHAR? | null for email users |
| avatar_url | VARCHAR? | |
| default_currency | CHAR(3) | e.g. "ILS" |
| created_at | TIMESTAMP | |

### `groups`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | |
| description | TEXT? | |
| image_url | VARCHAR? | |
| default_currency | CHAR(3) | |
| created_by | UUID → users | |
| created_at | TIMESTAMP | |

### `group_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID → groups | |
| user_id | UUID → users | |
| role | ENUM(admin, member) | |
| joined_at | TIMESTAMP | |

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | |
| icon | VARCHAR | emoji or icon name |
| color | VARCHAR | hex |
| is_default | BOOLEAN | seeded defaults |

### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID → groups | |
| paid_by | UUID → users | |
| description | VARCHAR | |
| amount | DECIMAL(12,2) | original amount |
| currency | CHAR(3) | original currency |
| amount_base | DECIMAL(12,2) | converted to base currency |
| base_currency | CHAR(3) | group's default currency |
| category_id | UUID → categories | |
| split_type | ENUM | EQUAL, EXACT, PERCENTAGE, SHARES |
| date | DATE | |
| receipt_url | VARCHAR? | |
| is_recurring | BOOLEAN | |
| recurrence_rule | VARCHAR? | iCal RRULE string |
| created_at | TIMESTAMP | |

### `expense_splits`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| expense_id | UUID → expenses | |
| user_id | UUID → users | |
| amount | DECIMAL(12,2) | share in base currency |
| is_settled | BOOLEAN | |
| settled_at | TIMESTAMP? | |

### `settlements`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID → groups | |
| from_user | UUID → users | payer |
| to_user | UUID → users | receiver |
| amount | DECIMAL(12,2) | |
| currency | CHAR(3) | |
| note | TEXT? | |
| created_at | TIMESTAMP | |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID → users | recipient |
| type | ENUM | expense_added, expense_settled, group_invite, payment_received |
| title | VARCHAR | |
| body | TEXT | |
| link | VARCHAR? | deep link to relevant page |
| is_read | BOOLEAN | |
| created_at | TIMESTAMP | |

### `currency_rates`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| from_currency | CHAR(3) | |
| to_currency | CHAR(3) | |
| rate | DECIMAL(12,6) | |
| fetched_at | TIMESTAMP | stale after 24h |

---

## Authentication

- **Email/Password:** bcrypt hashing, email verification on signup, password reset via email link
- **Google OAuth 2.0:** Passport.js strategy, creates or links account on first login
- **Tokens:** Short-lived JWT access token (15min) + long-lived refresh token (30 days) stored in httpOnly cookie
- **Protected routes:** Middleware validates access token on all `/api/*` routes except auth endpoints

---

## Features

### Groups
- Create, edit, delete groups
- Invite members via email (sends invite link) or shareable invite URL
- Admin can remove members, change roles
- Each group has a default currency for balance display

### Expenses
- Add/edit/delete expenses within a group
- Four split types:
  - **EQUAL** — amount divided equally among selected members
  - **EXACT** — specify exact amount per member (must sum to total)
  - **PERCENTAGE** — specify % per member (must sum to 100)
  - **SHARES** — specify weight per member, amount distributed proportionally
- Upload receipt image (uploaded to Cloudinary, URL stored in DB)
- Recurring expenses via iCal RRULE (daily, weekly, monthly)
- Multi-currency: user selects expense currency, app converts to group base currency using cached exchange rate

### Balance Calculation
- Computed on-demand from `expense_splits` and `settlements` tables
- Net balance per user = sum(what others owe them) - sum(what they owe others)
- Displayed in group's default currency

### Transaction Minimization Algorithm
Given `n` users in a group:
1. Compute each user's net balance (positive = is owed, negative = owes)
2. Separate into two lists: creditors (positive) and debtors (negative), sorted descending by absolute value
3. Greedy matching loop:
   - Take largest debtor and largest creditor
   - Create a settlement for `min(|debtor|, creditor)` from debtor → creditor
   - Reduce both balances; remove if zero, otherwise return to list
   - Repeat until all balances are zero
4. Result: at most `n-1` transactions for a group of `n` users

Multi-currency note: all balances are normalized to group base currency before minimization. Resulting settlement amounts are displayed in base currency.

### Settlements
- Mark a payment as "settled" — records a `settlements` row
- UI shows suggested settlement plan (from minimization algorithm)
- Deep links to Bit (`bit://pay?amount=X`) / PayBox (`paybox://...`) with pre-filled amount; fallback to web URL if app not installed
- Settling triggers `balance:recalculated` socket event to all group members

### Currency Support
- On expense creation, if currency ≠ group base currency, fetch rate from `currency_rates` cache
- If cache miss or stale (>24h), call ExchangeRate API and persist new rate
- `amount_base` stored at time of expense creation (rate is locked, not recalculated daily)

### Analytics
- Line chart: total expenses over time (filterable by group, date range)
- Pie chart: breakdown by category
- Bar chart: expenses per group member
- Export to CSV (raw data) and PDF (formatted report via html-to-pdf)
- Filters: date range, group, category, member

### Notifications
- **In-app:** Socket.io push to user's active sessions; unread count badge on bell icon
- **Email:** Sent on — new expense added to your group, someone settles a debt with you, group invite
- Notification center page with read/unread state

---

## Real-Time Events (Socket.io)

Users join a socket room per group on group page load.

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `expense:created` | server → group room | expense object | new expense added |
| `expense:updated` | server → group room | expense object | expense edited |
| `expense:deleted` | server → group room | `{ expenseId }` | expense deleted |
| `expense:settled` | server → group room | split object | split marked settled |
| `balance:recalculated` | server → group room | balances array | any balance change |
| `group:updated` | server → group room | group object | group metadata changed |
| `notification:new` | server → user room | notification object | any notification |

---

## API Routes (REST)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/google
GET    /api/auth/google/callback
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify-email?token=

GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PUT    /api/groups/:id
DELETE /api/groups/:id
POST   /api/groups/:id/invite
GET    /api/groups/:id/members
DELETE /api/groups/:id/members/:userId
GET    /api/groups/:id/balances
GET    /api/groups/:id/settlements/suggested

GET    /api/expenses?groupId=&page=&limit=
POST   /api/expenses
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id

POST   /api/settlements
GET    /api/groups/:id/settlements

GET    /api/analytics?groupId=&from=&to=
GET    /api/analytics/export?format=csv|pdf

GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all

GET    /api/currencies/rates?from=&to=
```

---

## UI Structure

### Layout
- **Desktop:** Fixed left sidebar (220px) with logo, nav links, and group list. Main content area fills remaining width.
- **Mobile:** Top header + bottom navigation bar (4 tabs: Dashboard, Groups, Expenses, Analytics).

### Pages

| Route | Page |
|-------|------|
| `/login` | Login form (email or Google) |
| `/register` | Registration form |
| `/forgot-password` | Password reset request |
| `/dashboard` | Balance summary cards + recent expenses across all groups |
| `/groups` | Group cards grid |
| `/groups/:id` | Group overview: optimized settlement plan + recent expenses |
| `/groups/:id/expenses` | Paginated expense list with filters |
| `/groups/:id/balances` | Per-member balances + minimized transaction list |
| `/expenses/new` | Add expense form (group selector, split type, currency) |
| `/expenses/:id` | Expense detail + edit |
| `/analytics` | Charts + export |
| `/notifications` | Notification center |
| `/settings` | Profile, default currency, notification preferences |

---

## Error Handling

- **API:** All errors return `{ error: { code, message } }` with appropriate HTTP status
- **Frontend:** React Query error boundaries; toast notifications for user-facing errors
- **Socket:** Auto-reconnect with exponential backoff; stale data banner if connection lost
- **Currency API failure:** Fall back to last cached rate; show warning badge on affected expense

---

## Deployment

- **Frontend:** Vercel (static, auto-deploy from `main`)
- **Backend:** Render (Node service)
- **Database:** Render PostgreSQL or Railway
- **Redis:** Render Redis or Railway Redis
- **Environment:** `.env` files for local, environment variables in hosting platform for production
