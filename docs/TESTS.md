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
      texte libre (plus le catalogue), un sélecteur d'attribut et un bouton "+ Justification"
      apparaissent ; le solde de points ne bouge pas quel que soit le score saisi (coût exclu du
      budget). Décocher → la compétence redevient sélectionnable depuis le catalogue et compte à
      nouveau dans le coût.
- [ ] Sur une compétence gratuite, cliquer "+ Justification" deux fois (ex. cas réel Conrad Lingus :
      "Collier Alphacien" +3 puis "Volonté de fer" +3) → chaque ligne a son propre champ score, le
      total affiché = score de base + somme des lignes (6 dans cet exemple), le badge "Gratuite"
      en lecture seule liste les deux justifications au survol.
- [ ] Activer un pouvoir psy (bouton dédié, hors mode édition) à un palier payant (ex. 20, 2 PSP)
      → PSP courant diminue de 2 immédiatement, badge "Actif · niveau 20 (2 PSP)" affiché,
      bouton "Désactiver" disponible. Désactiver → PSP remboursé (clampé au max), badge disparaît.
- [ ] Sur un pouvoir autre que "Concentration psy", renseigner l'effet optionnel (caractéristique
      ou compétence + valeur du bonus) avant d'activer → le bonus apparaît en évidence (badge
      ambre) sur l'attribut concerné (`AttributesPanel`) ou la compétence concernée
      (`SkillsPanel`), et une icône "⚡" apparaît sur la tuile du personnage à l'écran "Suivi des
      constantes".
- [ ] Sur l'écran "Suivi des constantes" (MJ), avec au moins un pouvoir actif sur un personnage en
      jeu : cliquer "Fin de combat" → tous les pouvoirs actifs des personnages en jeu sont
      désactivés, leur PSP remboursé, l'icône "⚡" disparaît de leurs tuiles.
- [ ] Sur "Concentration psy" (ex. cas réel Karun), choisir le palier 15 ou 20 → un sélecteur
      "Caractéristique boostée" (REF/DEX/VIT) apparaît toujours, sans clic supplémentaire ; choisir
      DEX ou VIT (pas REF) et activer → le bonus apparaît en évidence sur l'attribut choisi dans
      `AttributesPanel` (pas seulement sur le RA, réservé à REF). Choisir le palier 25 ou plus →
      le sélecteur disparaît, remplacé par la mention "Toutes les caractéristiques physiques
      (REF/DEX/VIT)", et les trois sont boostées sans choix à activer.

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
