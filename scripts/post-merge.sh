#!/bin/sh
set -eu

# Post-merge is dependency sync only. Production schema changes are applied by
# the API startup gate, which holds the advisory lock and verifies readiness.
corepack pnpm install --frozen-lockfile
