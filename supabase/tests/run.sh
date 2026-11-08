#!/usr/bin/env bash
# Runs the migration and the row-level-security test on a throwaway local Postgres 15+ (no Supabase needed).
# Usage: PGHOST=... PGPORT=... ./supabase/tests/run.sh   (an empty database you can drop)
set -euo pipefail
cd "$(dirname "$0")/.."
psql -v ON_ERROR_STOP=1 -q -f tests/00_supabase_stub.sql
psql -v ON_ERROR_STOP=1 -q -f migrations/20261108000000_init.sql
psql -v ON_ERROR_STOP=1 -f tests/10_rls_feed_test.sql
