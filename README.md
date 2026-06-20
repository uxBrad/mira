# Mira

Mira is a desktop application for accessibility auditors. It helps you document, classify, and report WCAG findings across audit projects — generating branded PDF reports and CSV exports.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron + Vite + React |
| Styling | Tailwind CSS + Radix UI |
| Local DB | SQLite via Drizzle ORM + libSQL |
| Auth / billing server | Next.js (deployed separately) |
| Email | Resend |
| Payments | Stripe |

## Project structure

```
echo/
├── src/                  # React renderer (UI)
│   ├── components/       # Shared UI components
│   ├── hooks/            # React hooks (useAuth, useFindings, etc.)
│   ├── pages/            # Route-level page components
│   └── lib/              # Utilities, WCAG data
├── electron/             # Main process
│   ├── main/             # Electron entry point, window setup
│   ├── ipc/              # IPC handlers (auth, projects, findings, export)
│   └── preload.ts        # Context bridge API
├── db/                   # Drizzle schema + migrations
├── server/               # Next.js API server (auth, subscriptions)
│   ├── app/api/          # Route handlers
│   ├── lib/              # Prisma, JWT, Resend, Stripe utilities
│   └── prisma/           # Prisma schema
└── electron-builder.yml  # Build configuration
```

## Development setup

### Prerequisites

- Node.js 18+
- The server requires a Postgres database (for auth) and optionally Resend + Stripe keys

### Install dependencies

```bash
npm install                    # desktop app
cd server && npm install       # API server
```

### Environment variables

**Desktop app** (`.env` in project root):
```
VITE_API_URL=http://localhost:3001
```

**Server** (`server/.env`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
RESEND_API_KEY=re_...           # optional in dev (emails auto-skip)
FROM_EMAIL=noreply@helloecho.app
STRIPE_SECRET_KEY=sk_test_...   # optional
STRIPE_WEBHOOK_SECRET=whsec_... # optional
```

### Run in development

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Electron app
npm run dev
```

In development, new registrations are **auto-verified** — no email setup needed.

### Database

The local SQLite database lives at:
- macOS: `~/Library/Application Support/echo/grounds-for-access.db`
- Windows: `%APPDATA%\echo\grounds-for-access.db`
- Linux: `~/.config/echo/grounds-for-access.db`

To generate and run migrations after schema changes:

```bash
npm run db:generate
npm run db:migrate
```

## Build

```bash
npm run build:mac    # macOS dmg
npm run build:win    # Windows installer
npm run build:linux  # Linux AppImage
```

## Auth flow

1. User registers → server creates account + sends 6-digit OTP via email
2. User enters OTP in app → `emailVerified` set to `true`
3. Login issues a short-lived JWT access token + long-lived refresh token
4. Electron stores session in an encrypted local store
5. Subscription status is fetched on each app launch; expired sessions fall back gracefully when offline

## Features

- **Projects** — create and manage audit projects with client name, URL, description, and status
- **Findings** — log accessibility issues with severity (critical / serious / moderate / minor), WCAG criterion, category, status, page URL, screenshot, recommendations, and notes
- **Filtering** — filter findings by severity and status
- **PDF export** — branded accessibility audit report with executive summary
- **CSV export** — flat spreadsheet of all findings for a project
- **Subscription** — 7-day free trial, then monthly or yearly plan via Stripe
