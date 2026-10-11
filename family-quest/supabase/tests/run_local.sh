#!/usr/bin/env bash
# 로컬 PostgreSQL 에서 마이그레이션 + RLS 테스트를 실행한다.
# 사용: bash supabase/tests/run_local.sh   (postgres 슈퍼유저로 접속 가능해야 함)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=fq_test
PSQL="psql -v ON_ERROR_STOP=1 -q"
run() { if [ "$(id -u)" = "0" ]; then su postgres -c "$*"; else "$@"; fi; }
run "dropdb --if-exists $DB"
run "createdb $DB"
run "$PSQL -d $DB -f supabase/tests/00_local_stub.sql"
run "$PSQL -d $DB -f supabase/migrations/0001_init.sql"
run "$PSQL -d $DB -f supabase/tests/10_rls_test.sql"
