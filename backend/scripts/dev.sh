#!/bin/sh
set -eu

frontend_pid=""
cleanup() {
    if [ -n "$frontend_pid" ]; then
        kill "$frontend_pid" 2>/dev/null || true
        wait "$frontend_pid" 2>/dev/null || true
    fi
}
trap cleanup 0
trap 'exit 130' INT TERM

# Build once before starting Hono so it never serves a missing or stale artifact.
VITE_SOURCE_MAP=true npm --prefix ../frontend run build
npm --prefix ../frontend run build:watch &
frontend_pid=$!

tsx watch --enable-source-maps "$@"
