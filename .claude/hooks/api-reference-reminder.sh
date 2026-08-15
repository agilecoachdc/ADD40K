#!/usr/bin/env bash
# PostToolUse hook: quand Claude édite une route Hono (src/worker/routes/*.ts)
# ou une migration qui définit une table, rappelle de tenir
# docs/API_REFERENCE.md à jour.
#
# Repris du pattern api-reference-reminder.sh de Peakabox (ex-CrossfitCarnotzet),
# adapté à ce repo (routes Hono au lieu de Route Handlers Next.js/Edge Functions).
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
rel="${file_path#"$project_dir"/}"
rel="${rel#/}"

case "$rel" in
  docs/API_REFERENCE.md ) exit 0 ;;
esac

matched=0
case "$rel" in
  src/worker/routes/*.ts ) matched=1 ;;
  src/worker/index.ts ) matched=1 ;;
  migrations/*.sql )
    if grep -qiE "create table" "$file_path" 2>/dev/null; then
      matched=1
    fi
    ;;
esac
[ "$matched" -eq 0 ] && exit 0

jq -n --arg path "$rel" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Touché une surface appelable : " + $path +
      ". Avant de terminer ou de committer, mettre à jour docs/API_REFERENCE.md : ajouter/ajuster l'entrée pour toute route ajoutée ou modifiée (auth requise, entrées, sorties, erreurs). Retirer les entrées pour les routes supprimées.")
  }
}'
