#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:=http://127.0.0.1:8080}"

jq_bin=$(command -v jq || true)
if [[ -z "$jq_bin" ]]; then
  echo "jq is required for smoke test" >&2
  exit 1
fi

echo "[1/7] healthz"
curl -fsS "$BASE_URL/healthz" >/dev/null

echo "[2/7] create user"
user=$(curl -fsS -X POST "$BASE_URL/api/users" -H 'content-type: application/json' \
  -d '{"name":"Smoke User","email":"smoke-'"$(date +%s)'"'@example.com"}')
user_id=$(echo "$user" | jq -r '.id')

echo "[3/7] login"
curl -fsS -X POST "$BASE_URL/api/auth/login" >/dev/null

echo "[4/7] get project"
project_id=$(curl -fsS "$BASE_URL/api/projects" | jq -r '.[0].id')

issue_payload=$(jq -n --arg pid "$project_id" --arg uid "$user_id" '{projectId:$pid,title:"Smoke issue",description:"created by smoke test",status:"todo",priority:"medium",creatorId:$uid,assigneeId:$uid}')

echo "[5/7] create issue"
issue=$(curl -fsS -X POST "$BASE_URL/api/issues" -H 'content-type: application/json' -d "$issue_payload")
issue_id=$(echo "$issue" | jq -r '.id')

echo "[6/7] patch issue + create comment"
patch_payload=$(jq -n --arg id "$issue_id" '{id:$id,status:"in_progress"}')
curl -fsS -X PATCH "$BASE_URL/api/issues" -H 'content-type: application/json' -d "$patch_payload" >/dev/null
comment_payload=$(jq -n --arg iid "$issue_id" --arg uid "$user_id" '{issueId:$iid,authorId:$uid,body:"smoke comment"}')
curl -fsS -X POST "$BASE_URL/api/comments" -H 'content-type: application/json' -d "$comment_payload" >/dev/null

echo "[7/7] verify persisted state"
curl -fsS "$BASE_URL/api/issues?status=in_progress" | jq -e --arg id "$issue_id" 'map(select(.id == $id)) | length == 1' >/dev/null
curl -fsS "$BASE_URL/api/comments?issueId=$issue_id" | jq -e 'length >= 1' >/dev/null

echo "Smoke test passed. Restart server and rerun step [7/7] commands to validate cross-restart persistence."
