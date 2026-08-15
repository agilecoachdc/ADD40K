#!/usr/bin/env bash
# PostToolUse hook: en parallèle de docs-reminder.sh. Quand Claude édite le
# moteur de calcul (src/shared/calc-engine.ts) ou le modèle de données
# (src/shared/types.ts), rappelle de mettre à jour calc-engine.test.ts et
# docs/TESTS.md — le calcul de points/PV/PSP est le cœur critique de l'app
# (cf. scripts/release-check.sh qui le fait tourner avant tout déploiement).
#
# Repris du pattern tests-reminder.sh de Peakabox (ex-CrossfitCarnotzet).
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
rel="${file_path#"$project_dir"/}"
rel="${rel#/}"

case "$rel" in
  src/shared/calc-engine.ts | src/shared/types.ts | src/worker/routes/*.ts ) ;;
  * ) exit 0 ;;
esac

jq -n --arg path "$rel" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Touché : " + $path +
      ". Avant de terminer ou de committer : mettre à jour src/shared/calc-engine.test.ts si une formule a changé (PV, PSP, coût compétence, solde de points), et docs/TESTS.md si un scénario manuel (login, permissions, édition) est affecté. `npm run test` doit rester vert.")
  }
}'
