# Mira — Code

<!-- second-brain-link -->
## Second Brain link (read first, keep in sync)

This code project's Brain folder is `C:\Users\18563\Desktop\All\Brain\Projects\Jecture\Mira\` (Mira).

**At the start of every session, read:** `README.md`, `SESSION_NOTES.md`, `Backlog.md`, `Memory.md` in that folder (and `DECISIONS.md` before changing direction). Then this file.

**While working:**
- `Backlog.md` is the task list. When an item is finished, change `- [ ]` to `- [x]` in `Backlog.md` right away, and say which items you checked. Add new work we discover as `- [ ]` under Now, Next, or Later.
- Brad also checks items himself. Re-read `Backlog.md` before picking the next task; the file is the source of truth.
- After each commit and push, add a dated entry to `Changelog.md`. Log lasting choices in `DECISIONS.md`.
- `/end` writes the session out: it moves checked items from `Backlog.md` into `Changelog.md`, updates `SESSION_NOTES.md` and `Memory.md`, adds a `Logs/` entry, and updates `Brain/Projects/PULSE.md`.
- Ask before editing Brain notes Brad wrote (anything outside the files above). Never delete files, move them to `Archive/`.
<!-- second-brain-link -->

Electron + React + TypeScript app. Brain docs: `Brain/Projects/Jecture/Mira/`

## Dev Commands

```bash
cd Projects/mira
npm run dev          # run app in development
npm run typecheck    # typecheck both node and web
npm run build:win    # build Windows installer
npm run build:mac    # build Mac DMG
npm run db:generate  # regenerate Drizzle schema
npm run db:migrate   # run pending migrations
```

Mira server (Next.js auth/payments, runs on port 3001):

```bash
cd Projects/mira/server
npm run dev          # start auth server
npm run db:push      # sync Prisma schema to DB
npm run db:studio    # open Prisma Studio
```
