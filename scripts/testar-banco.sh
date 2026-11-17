#!/bin/sh
# Roda os testes pgTAP de supabase/tests/database direto no container do banco local.
# (Alternativa a `supabase test db`, que precisa que o Docker Desktop tenha
# permissão para montar a pasta do projeto.)
set -e

CONTAINER="supabase_db_douglas-estudio"
DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/tests/database"

falhas=0
for arquivo in "$DIR"/*.test.sql; do
  echo "# $(basename "$arquivo")"
  saida=$({
    echo "set client_min_messages = warning;"
    echo "create extension if not exists pgtap with schema extensions;"
    cat "$arquivo"
  } | docker exec -i "$CONTAINER" psql -U postgres -d postgres -q -X -t -A -v ON_ERROR_STOP=1 2>&1) || falhas=1
  echo "$saida" | grep -E '^(ok|not ok|#|1\.\.)|ERROR' || true
  echo "$saida" | grep -qE '^not ok|ERROR' && falhas=1
done

if [ "$falhas" -ne 0 ]; then
  echo "FALHOU"
  exit 1
fi
echo "Todos os testes do banco passaram."
