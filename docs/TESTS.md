# Inventaire de tests — add40k

Automatisé par `npm run test` (Vitest, `src/shared/calc-engine.test.ts`) : formules PV/PSP,
coût compétences/pouvoirs, budget de points, cas réel Stern Tack figé (voir le fichier de test
pour les valeurs). `scripts/release-check.sh` fait tourner ce test + le typecheck avant chaque
déploiement.

Les scénarios ci-dessous sont **manuels** — à repasser après tout changement touchant auth,
permissions ou l'UI de la fiche. Vérifiés une première fois le 2026-08-15 (§1-§4 tous ✅ via le
navigateur intégré, cf. session de build).

## §1 — Auth

- [ ] Login MJ (`mj` + mot de passe généré) → redirigé vers `/`, liste des 8 personnages visible.
- [ ] Login joueur (ex. `jo` / Karun) → même liste visible en lecture, badge "Ma fiche" sur Karun
      uniquement.
- [ ] Login avec mauvais mot de passe → message "Identifiants invalides", pas de redirection.
- [ ] Déconnexion → retour à `/login`, `GET /api/auth/me` renvoie 401.

## §2 — Consultation

- [ ] Ouvrir une fiche (ex. Stern Tack) → identité, PV/PSP, attributs, compétences, armes,
      armures, pouvoirs psy, avantages, équipement, budget de points et localisations tous
      affichés sans erreur console.
- [ ] Le solde de points affiche un avertissement rouge si négatif (cas réel : Stern Tack,
      Frigg, Jonas, Stella sont tous en négatif après import — attendu, cf.
      `scripts/import-report.md`).

## §3 — Édition

- [ ] Connecté en MJ ou en tant que propriétaire : bouton "Modifier" visible, bascule les
      champs en inputs.
- [ ] Modifier une compétence (score) → le coût et le solde se recalculent en direct, avant même
      d'enregistrer.
- [ ] Cliquer "Enregistrer" → retour en lecture seule, valeurs persistées (vérifiable via
      `wrangler d1 execute r2t2 --local --command "SELECT data FROM characters WHERE id=...`).
- [ ] Cliquer "Annuler" après modification → repasse en lecture seule sans appeler l'API,
      valeurs d'avant l'édition restaurées au prochain chargement.
- [ ] Boutons +/- PV et PSP → mettent à jour le compteur actuel/max immédiatement (état local),
      persistés uniquement après "Enregistrer".
- [ ] Ajouter une compétence, cocher "Gratuite (avantage/matériel)" → le champ nom devient du
      texte libre (plus le catalogue), un sélecteur d'attribut et un champ "Justification"
      apparaissent ; le solde de points ne bouge pas quel que soit le score saisi (coût exclu du
      budget). Décocher → la compétence redevient sélectionnable depuis le catalogue et compte à
      nouveau dans le coût.

## §4 — Permissions

- [ ] Connecté en tant que joueur A, `GET /api/characters/<perso-B>` → 200, `canEdit: false`,
      pas de bouton "Modifier" affiché.
- [ ] `PUT /api/characters/<perso-B>` depuis le compte du joueur A → 403.
- [ ] Connecté en MJ, `PUT` sur n'importe quel personnage → 200.

## Non couvert (hors périmètre MVP)

- Assistant de création de personnage complet (point-buy from scratch).
- Aides de jeu visuelles de combat.
- E2E automatisé (Playwright) — app à petite échelle, groupe restreint ; à ajouter si le projet
  grossit (cf. `.claude/skills/cloudflare-r2t2/SKILL.md`).
