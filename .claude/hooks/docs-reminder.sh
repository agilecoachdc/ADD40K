#!/usr/bin/env bash
# PostToolUse hook: quand Claude édite/écrit un fichier sous src/, migrations/
# ou scripts/, rappelle de tenir README.md à jour si le changement touche une
# route, le modèle de données ou le flux d'import/déploiement.
#
# Repris du pattern docs-reminder.sh de Peakabox (ex-CrossfitCarnotzet),
# adapté à ce repo single-package (pas de monorepo apps/packages).
#
# Configuré dans .claude/settings.json -> hooks.PostToolUse, matché sur
# Edit|Write|MultiEdit. Stdin est le payload JSON standard de l'événement.
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
rel="${file_path#"$project_dir"/}"
rel="${rel#/}"

case "$rel" in
  src/* | migrations/* | scripts/* ) ;;
  * ) exit 0 ;;
esac

case "$rel" in
  *.test.ts | *.test.tsx ) exit 0 ;;
  src/shared/reference-data.ts ) exit 0 ;;  # généré par import_xlsx.py
  scripts/characters.seed.json | scripts/import-report.md | scripts/generated-credentials.md ) exit 0 ;;
  */node_modules/* ) exit 0 ;;
esac

jq -n --arg path "$rel" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Touché : " + $path +
      ". Avant de terminer ou de committer, vérifier si README.md doit être mis à jour (routes API, modèle Character, flux import/seed/déploiement). Voir aussi docs/API_REFERENCE.md et docs/TESTS.md.")
  }
}'
