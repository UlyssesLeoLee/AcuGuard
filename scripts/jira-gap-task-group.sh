#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TASKS=(
  "npm run lint"
  "npm run build"
)

printf '\n[Task Group] AcuGuard vs Jira baseline checks\n'
printf 'Repository: %s\n\n' "$ROOT_DIR"

for task in "${TASKS[@]}"; do
  printf '▶ Running: %s\n' "$task"
  eval "$task"
  printf '✔ Done: %s\n\n' "$task"
 done

cat <<'REPORT'
Improvement backlog (relative to Jira):
1) Persistent workflow engine: missing configurable statuses/transitions/validators.
2) RBAC & permissions: only login exists; no project/issue-level authorization matrix.
3) Database completeness: handlers still use mock data, not PostgreSQL.
4) Auditability: no immutable activity log, change history, or field-level timeline.
5) Notifications: no subscription model, mention parser, or async delivery pipeline.
6) Search & filtering: no indexed full-text search, saved filters, or JQL-equivalent query layer.
7) SLA/operations: no SLO metrics, alerting, rate limiting, idempotency keys, or retry policy.
8) Integrations: no webhooks/automation rules/platform events.
REPORT
