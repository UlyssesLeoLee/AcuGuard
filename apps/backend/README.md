# AcuGuard Actix Backend

真实后端服务，提供与当前前端所需接口兼容的 `/api/*` 路由，并通过 PostgreSQL 持久化。

## 功能
- 启动时自动执行 `sql/schema.sql` DDL，确保必要表和索引存在。
- 用户读写更新：
  - `GET /api/users`
  - `POST /api/users`
  - `PATCH /api/users/{id}`
- 前端已使用能力：
  - `POST /api/auth/login`
  - `GET /api/projects`
  - `GET/POST/PATCH /api/issues`
  - `GET/POST /api/comments`
- 连接池与多 worker（`num_cpus`）保证并发吞吐。

## 环境变量
- `DATABASE_URL`（必填）
- `JWT_SECRET`（可选，默认 `dev-secret`）
- `BIND_ADDR`（可选，默认 `0.0.0.0:8080`）

## 启动
```bash
cd apps/backend
cargo run
```

健康检查：`GET /healthz`
