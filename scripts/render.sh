#!/bin/bash
# Wrapper used by VHS: ensures bun is in PATH then renders status line
export PATH="/Users/barnu/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
exec bun run "$REPO/src/index.ts"
