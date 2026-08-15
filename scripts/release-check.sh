#!/usr/bin/env bash
# scripts/release-check.sh
#
# Gate pré-déploiement. Fait tourner ce qui peut l'être automatiquement et
# affiche un résumé en une phrase à la fin. Sort en erreur si un step
# échoue, pour que le script "deploy" appelant s'arrête avant que wrangler
# ne mette en ligne une version cassée.
#
# Câblé dans package.json -> "deploy", donc chaque `npm run deploy` le fait
# tourner en premier.
#
# Lancement manuel :
#   bash scripts/release-check.sh
#
# Couvert aujourd'hui :
#   - TypeScript (`npm run typecheck`).
#   - Tests unitaires du moteur de calcul (`npm run test`, cf. calc-engine.test.ts).
#
# Pas encore couvert (scénarios manuels reconnus dans docs/TESTS.md) :
#   - Flux UI / permissions bout en bout. Pas d'e2e Playwright pour l'instant
#     (app à petite échelle, 8 personnages, groupe restreint — cf. plan).
#
# Repris du pattern release-check.sh de Peakabox (ex-CrossfitCarnotzet), allégé
# (pas de Postgres/Playwright/Docker ici).

set -uo pipefail
cd "$(dirname "$0")/.."

start_ts=$(date +%s)

red()   { printf '\033[0;31m%s\033[0m' "$1"; }
green() { printf '\033[0;32m%s\033[0m' "$1"; }
yellow(){ printf '\033[0;33m%s\033[0m' "$1"; }

declare -i fail=0
typecheck_status=skip
tests_status=skip
tests_passed=0
tests_total=0

echo "──────────────────────────────────────────────────────"
echo " Release check — $(date '+%Y-%m-%d %H:%M:%S')"
echo "──────────────────────────────────────────────────────"

echo
echo "$(yellow '▶') typecheck (npm run typecheck)"
if npm run typecheck > .release-check.typecheck.log 2>&1; then
  typecheck_status=pass
  echo "  $(green '✓') typecheck"
else
  typecheck_status=fail
  fail=$((fail + 1))
  echo "  $(red '✗') typecheck — voir .release-check.typecheck.log"
fi

echo
echo "$(yellow '▶') tests (npm run test)"
if npm run test > .release-check.tests.log 2>&1; then
  tests_status=pass
  summary_line=$(grep -E '^[[:space:]]*Tests ' .release-check.tests.log | tail -1 || true)
  tests_passed=$(printf '%s' "$summary_line" | sed -nE 's/.*Tests +([0-9]+) passed.*/\1/p')
  tests_total=$(printf '%s' "$summary_line" | sed -nE 's/.*\(([0-9]+)\).*/\1/p')
  tests_passed=${tests_passed:-0}
  tests_total=${tests_total:-0}
  echo "  $(green '✓') $tests_passed/$tests_total passing"
else
  tests_status=fail
  fail=$((fail + 1))
  echo "  $(red '✗') tests — voir .release-check.tests.log"
fi

end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))

echo
echo "──────────────────────────────────────────────────────"
if [ "$fail" -eq 0 ]; then
  echo " $(green 'RELEASE CHECK PASSED')"
  echo
  echo " Résumé :"
  echo "   • typecheck : pass"
  echo "   • tests : ${tests_passed}/${tests_total} passing"
  echo "   • scénarios manuels (voir docs/TESTS.md) : non exécutés par ce script"
  echo "   • durée : ${elapsed}s"
else
  echo " $(red 'RELEASE CHECK FAILED') ($fail étape(s))"
  echo
  echo " Résumé :"
  echo "   • typecheck : $typecheck_status"
  echo "   • tests : $tests_status (${tests_passed}/${tests_total})"
  echo "   • logs : .release-check.{typecheck,tests}.log"
fi
echo "──────────────────────────────────────────────────────"

exit "$fail"
