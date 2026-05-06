# AI Jira-like MVP (Next.js + Neon + Drizzle)

## Stack
- Next.js App Router + TypeScript (single app fullstack in `apps/web`)
- Route Handlers as BFF APIs
- PostgreSQL (Neon) + Drizzle schema
- Tailwind + plugin-oriented UI groups

## Quick start
```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

## Env
- `DATABASE_URL` (Neon)
- `JWT_SECRET`

## Vercel deploy
1. Push to GitHub.
2. Import repo in Vercel.
3. Add Neon Postgres from Vercel Marketplace and map `DATABASE_URL`.
4. Set `JWT_SECRET`.
5. Deploy. Every push auto-deploys.

## API
- `POST /api/auth/login`
- `GET /api/projects`
- `GET/POST/PATCH /api/issues`
- `GET/POST /api/comments`
- `POST /api/ai/{summary|subtasks|priority|comment}` (mock suggestions only)

## Plugin architecture (MVP)
- `Plugin`
- `IssuePluginGroup`
- `BoardPluginGroup`
- `AIPluginGroup`
- `AppShell`


## Binary assets policy
- Favicon has been switched from committed binary `.ico` to runtime-generated `app/icon.tsx` to keep repository text-only where practical.
