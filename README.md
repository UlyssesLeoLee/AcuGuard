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

## Deployment readiness status (current)
- ✅ **Build/runtime**: Next.js app can be deployed to Vercel.
- ⚠️ **Database integration**: `DATABASE_URL` is declared and Drizzle schema exists, but route handlers currently read/write in-memory mock data (`src/lib/mock-data.ts`) rather than Postgres.
- ⚠️ **Migrations**: Drizzle config exists, but SQL migration files and an automated migration step are not included yet.

To be truly "deploy-and-run with database", implement DB-backed route handlers and include migration/seed flow in deployment.

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

## Common Vercel issue: deployed but shows `404: NOT_FOUND`
If Vercel shows **"Congratulations"** but the preview is `404: NOT_FOUND`, the project is usually building from the repo root instead of the Next.js app directory.

Fix in Vercel project settings:
1. Go to **Project → Settings → General**.
2. Set **Root Directory** to `apps/web`.
3. In **Environment Variables**, set at least:
   - `JWT_SECRET`
   - `DATABASE_URL` (from Neon integration, if enabled)
4. Redeploy from **Deployments → ... → Redeploy**.

Expected result: opening the production/preview URL should load the app home page (`/`) instead of 404.

## 一键任务组：Jira 差距基线检查
在仓库根目录执行：

```bash
npm run taskgroup:jira-gap
```

该任务组会自动执行：
1. `npm run lint`
2. `npm run build`

并在命令行输出当前与 Jira 的关键能力差距清单，便于快速评估下一阶段建设优先级。
