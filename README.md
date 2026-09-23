# CakeCart 🎂 — Production-Ready Home-Bakery Platform

> **Artisan home-bakery ordering web app** engineered with Next.js App Router, Tailwind CSS, Neon Serverless PostgreSQL, Drizzle ORM with atomic transactions, 10-minute hold reservations, 48-hour minimum lead-time enforcement, custom message fees, pickup collection QR passes, and a dedicated Baker Operations Dashboard.

Built by **Team CakeCart**:
- **Agent 1 - App Agent**: Modern responsive frontend, customisation studio, live capacity tracker, checkout timer, and baker portal.
- **Agent 2 - Database Engine Agent**: Neon PostgreSQL schema, Drizzle ORM migrations, check constraints, `SELECT ... FOR UPDATE` locking, and expired hold cleanup engine.
- **Agent 3 - QA Agent**: Automated test suite with 37 checks validating concurrency race conditions, lead-time rules, hold releases, payment idempotency, and 24h cancellation cut-offs.

---

## Key Features

- **Small-Batch Daily Capacity Limits**: Real-time capacity tracker (`reserved_cakes <= max_cakes`) preventing overbooking.
- **Dedicated 2-Hour Pickup Slots**: Configurable collection windows per bakery date.
- **Atomic 10-Minute Hold Reservation**: When proceeding to checkout, capacity and slot rows are locked using `SELECT ... FOR UPDATE` with a 10-minute temporary hold.
- **Expired Hold Cleanup Cron**: Server-side `/api/cron/release-holds` protected by `CRON_SECRET` and scheduled via `vercel.json` (`*/10 * * * *`).
- **48-Hour Minimum Lead Time**: Enforced on both client and server to guarantee scratch-baking and chilling time.
- **Cake Customization Studio**:
  - Size selection with dynamic portion pricing deltas.
  - Flavour infusion selection.
  - Custom piped plaque message with **40-character limit** counter and automatic **$2.50 fee**.
  - Reference photo upload powered by **Vercel Blob** (with local dev fallback).
- **Collection Pass & QR Code**: Dynamic QR code generated with pickup verification tokens for counter scanning.
- **24-Hour Cancellation Cut-Off**: Customers can cancel eligible orders self-service until 24 hours before pickup, automatically restoring bakery capacity.
- **Baker Studio Dashboard**:
  - Filter orders by pickup date and status.
  - Advance status (`BAKING` ➔ `READY` ➔ `COLLECTED`).
  - Adjust daily capacity (`max_cakes`) and toggle date closures (`isClosed`).
  - Real-time revenue and order metrics.
- **Payment Gateway (Test Mode)**:
  - Stripe test mode / simulation with idempotency key protection preventing duplicate charges on retries or duplicate webhook delivery.
  - Never exposes database or payment secrets in browser code.

---

## Technology Stack

- **Framework**: Next.js 15+ (App Router, Server Components & Server Actions / Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with bespoke luxury patisserie tokens
- **Database**: Neon Serverless PostgreSQL with Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Embedded Local Testing**: `@electric-sql/pglite` (Zero-dependency local PostgreSQL execution for tests and offline development)
- **Authentication**: Custom session management in `httpOnly` secure cookies with `jose` (JWT) & `bcryptjs`
- **Asset Storage**: `@vercel/blob` (Vercel Blob Storage)
- **Payment Provider**: Stripe in Test Mode with Webhook verification
- **Icons & Utilities**: `lucide-react`, `qrcode`

---

## Database Architecture & Rules

The schema is defined in [`src/db/schema.ts`](src/db/schema.ts) adhering to strict PostgreSQL standards:
- **UUID Primary Keys**: Generated with `gen_random_uuid()`.
- **Money as Minor Units**: Stored as integers in cents (e.g. `$58.00` = `5800`).
- **UTC Timestamps**: All datetime fields store `timestamp with time zone`.
- **Database-Level Constraints**:
  - `reserved_cakes <= max_cakes` AND `reserved_cakes >= 0`
  - `reserved_orders <= max_orders` AND `reserved_orders >= 0`
  - `cake_message` varchar(40)
  - Unique constraint on `daily_capacity(bakery_date)`
  - Unique constraint on `orders(order_number)`
  - Unique constraint on `payments(idempotency_key)`

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 10+

### 2. Installation
```bash
git clone <repository_url>
cd LearnCAKEshopAntigravity23sep26
npm install
```

### 3. Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled Neon PostgreSQL connection string | `postgres://user:pass@ep-...-pooler.neon.tech/neondb` |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection string for migrations | `postgres://user:pass@ep-...neon.tech/neondb` |
| `AUTH_SECRET` | Secret key for signing session cookies | `cakecart-production-super-secret-key-32-chars-min!` |
| `CRON_SECRET` | Secret bearer token protecting scheduled cron | `cakecart_cron_secret_secure_token_98765` |
| `BLOB_READ_WRITE_TOKEN`| Vercel Blob access token | `vercel_blob_rw_token_...` |
| `STRIPE_SECRET_KEY` | Stripe test secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET`| Stripe webhook secret | `whsec_...` |

*(Note: If `DATABASE_URL` is omitted locally, the app automatically initializes an embedded PostgreSQL instance via `@electric-sql/pglite` in `.cakecart_db`, allowing instant local testing without cloud credentials!)*

### 4. Database Seeding
Seed products, categories, dietary tags, 14 days of capacity, pickup slots, and test accounts:
```bash
npm run db:seed
```

#### Pre-configured Test Accounts:
- **Head Baker**: `baker@cakecart.local` / `bakerpass123`
- **Customer**: `customer@cakecart.local` / `customerpass123`

### 5. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated QA Test Suite

Run the full end-to-end QA test suite:
```bash
npm test
```
Or:
```bash
npm run test:qa
```

### Verified Test Cases (37 Checks):
1. **Migrations & Schema**: Verifies all 14 tables, UUID defaults, and check constraints.
2. **Auth & Security**: Registration, invalid password rejection, JWT creation, httpOnly session verification.
3. **Catalog & 40-Char Limit**: Browsing, filtering, and server-side rejection of custom messages > 40 chars.
4. **Server Fee Calculations**: Base cake + size delta + flavour delta + $2.50 custom message fee.
5. **Concurrency Race Condition Test**: Two simultaneous order requests claiming the last cake slot. Exactly 1 order succeeds, 1 receives 409 Conflict / Sold Out, and capacity never goes negative or exceeds max.
6. **Expired Hold Release**: Verifies that orders older than 10 minutes are marked `EXPIRED` and capacity is restored back to the schedule.
7. **Lead-Time Rules**: Rejection of orders < 48 hours in advance or on closed dates.
8. **Payment Idempotency**: Duplicate payment attempts return existing confirmation without duplicate reservations.
9. **24-Hour Cancellation Cut-Off**: Orders can be cancelled > 24 hours before pickup, and rejected < 24 hours.
10. **Customer Isolation**: Customer B cannot view or cancel Customer A's orders.

---

## Vercel Deployment Guide

### 1. Provision Neon PostgreSQL via Vercel Marketplace
1. Navigate to the **Storage** tab in your Vercel Project Dashboard.
2. Click **Create Database** and select **Neon Serverless Postgres**.
3. Vercel automatically sets the `DATABASE_URL` (pooled) and `POSTGRES_URL_NON_POOLING` environment variables.

### 2. Configure Environment Variables in Vercel
In **Project Settings** ➔ **Environment Variables**, configure:
- `AUTH_SECRET`: Random 32+ character string.
- `CRON_SECRET`: Random secret string (must match Vercel Cron header).
- `BLOB_READ_WRITE_TOKEN`: Automatically populated if you add **Vercel Blob** from the Storage tab.
- `STRIPE_SECRET_KEY`: Your Stripe test key.
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret.

### 3. Deploy
Deploy using the Vercel CLI or Git push:
```bash
vercel --prod
```

### 4. Run Migrations on Neon
Execute migrations against your Neon production database:
```bash
npm run db:push
npm run db:seed
```

### 5. Scheduled Cron Job
Vercel automatically detects [`vercel.json`](vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/release-holds",
      "schedule": "*/10 * * * *"
    }
  ]
}
```
Every 10 minutes, Vercel triggers `/api/cron/release-holds` with the `CRON_SECRET` authorization header to release unconfirmed holds.

---

## License
MIT © CakeCart Bakery Ltd.
