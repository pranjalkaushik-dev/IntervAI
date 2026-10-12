#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  for pid in "$SERVER_PID" "$AI_PID" "$FRONTEND_PID"; do
    kill "$pid" 2>/dev/null || true
    pkill -TERM -P "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

( cd "$ROOT/server" && npm run dev ) & SERVER_PID=$!
( cd "$ROOT/ai-monitoring" && npm run dev ) & AI_PID=$!
( cd "$ROOT/frontend" && npm run dev ) & FRONTEND_PID=$!

echo "IntervAI development stack started."
echo "Frontend:      http://localhost:5179"
echo "Backend:       http://localhost:5001"
echo "AI monitoring: http://localhost:5050"
wait
