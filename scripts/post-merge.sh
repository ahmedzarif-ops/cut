#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Apply committed migrations (production schema path). `push` is dev-only;
# see lib/db/migrations and ARCHITECTURE.md.
pnpm --filter @workspace/db run migrate
