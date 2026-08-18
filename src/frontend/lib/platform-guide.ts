// Contenu du guide d'utilisation de la plateforme (générique, indépendant
// de la règle jouée) — affiché sur la page Documentation
// (src/frontend/pages/Documentation.tsx), aux côtés des règles du jeu
// propres au groupe consulté (ReferenceData de sa règle). Contrairement au
// dictionnaire i18n.ts (clé = texte français, phrases courtes d'UI), ce
// contenu est du texte long formaté en paragraphes : bilingue par bloc
// complet (FR/EN) plutôt que traduit ligne à ligne, plus simple à
// maintenir pour de la prose. Étendre à une 3e langue : ajouter son bloc
// ici et lister le nouveau code dans Language (shared/types.ts).

import type { Language } from "@shared/types";

export interface GuideSection {
  title: string;
  paragraphs: string[];
}

export interface GuideContent {
  /** Sections communes à tout compte (joueur ou MJ). */
  common: GuideSection[];
  /** Sections propres au rôle joueur. */
  player: GuideSection[];
  /** Sections propres au rôle MJ. */
  gm: GuideSection[];
}

const FR: GuideContent = {
  common: [
    {
      title: "Se connecter et changer de langue",
      paragraphs: [
        "Connectez-vous avec l'identifiant et le mot de passe fournis par votre MJ ou l'administrateur de la plateforme. Une fois connecté, la page « Mon profil » (lien en haut de chaque écran) permet de changer la langue de l'interface entre français et anglais — le choix est mémorisé sur votre compte et s'applique dès la prochaine page chargée.",
      ],
    },
    {
      title: "Naviguer dans l'application",
      paragraphs: [
        "L'écran d'accueil liste les groupes dont vous êtes membre — chacun mène à son propre écran « Personnages », qui liste les fiches du groupe et donne accès au dossier Drive partagé s'il est renseigné.",
        "Depuis l'écran « Personnages », cliquer sur une fiche l'ouvre en lecture seule ; le bouton « Modifier » (visible si vous en avez le droit) bascule les champs en édition. Cette page de documentation est accessible depuis l'écran « Personnages » de chaque groupe, et présente les règles du jeu effectivement utilisées par ce groupe.",
      ],
    },
    {
      title: "Rejoindre ou créer un groupe",
      paragraphs: [
        "Depuis la page « Mon profil », vous pouvez demander à rejoindre un groupe existant — la demande reste « en attente d'approbation du MJ » tant qu'un MJ déjà membre de ce groupe ne l'a pas approuvée ; vous n'avez accès à rien de ce groupe avant approbation. Vous pouvez annuler une demande en attente, ou quitter un groupe dont vous êtes déjà membre.",
        "Un MJ peut aussi créer un nouveau groupe directement depuis cette même page, en choisissant le jeu et la règle utilisés à table.",
      ],
    },
    {
      title: "La fiche de personnage",
      paragraphs: [
        "Chaque section de la fiche (Identité, Attributs, Compétences, Armes, Armures, Pouvoirs Psy, Avantages, Équipement, Budget de points) est repliable — cliquez sur son en-tête pour la masquer ou l'afficher, un simple confort d'affichage qui ne modifie rien à la fiche.",
        "Le nom d'une compétence, d'un pouvoir, d'un avantage/inconvénient est survolable : une infobulle affiche sa description tirée des règles du jeu, quand elle est disponible.",
      ],
    },
    {
      title: "Attributs et compétences",
      paragraphs: [
        "Un attribut total = score de base (saisi sur la fiche) + bonus racial (fixé par la race du personnage) + bonus « tech » (rare, ex. cyberware). Cliquer sur un attribut en mode édition affiche ce détail.",
        "Une compétence se choisit normalement dans le catalogue de la règle (son nom encode l'attribut lié, ex. « Commandement (COM) ») ; son score total = score saisi + total de l'attribut lié.",
        "Une compétence peut aussi être marquée « Gratuite (avantage/matériel) » lorsqu'elle est déjà acquise via un avantage et/ou du matériel plutôt qu'achetée en points — son coût est alors exclu du budget. Une compétence gratuite accepte plusieurs lignes de justification (bouton « + Justification »), chacune pouvant porter sa propre contribution en points, qui s'additionnent au score de base ; comme elle est en général hors catalogue, son nom se saisit librement et son attribut lié se choisit manuellement.",
        "Une compétence peut aussi être marquée « Affinité » : un pur modificateur (pas d'ajout d'attribut à son propre score, déjà compté au niveau de la cible) pour une autre compétence, un pouvoir psy précis, ou toute une discipline de pouvoirs psy — la cible se choisit explicitement (case « Compétence »/« Pouvoir »/« Discipline » puis sélection du nom exact) plutôt que d'être déduite du nom de la ligne. Le bonus s'ajoute automatiquement au score total de sa cible, mis en évidence par un badge ambre.",
      ],
    },
    {
      title: "Armes et armures",
      paragraphs: [
        "Une seule arme peut être « équipée » à la fois (case à cocher à côté de son nom) — c'est la seule qui compte dans le calcul du Rang d'Action — sauf avec l'avantage « Ambidextre », qui permet d'en équiper deux simultanément ; équiper une arme au-delà de cette limite déséquipe automatiquement la plus ancienne. Des modificateurs justifiés (ex. une amélioration listée dans l'équipement) peuvent s'ajouter aux valeurs de base d'une arme (score, dégâts, Rang d'Action) via le bouton « Modificateurs ».",
        "Plusieurs armures peuvent être actives en même temps ; leur protection (VP par membre : tête/bras/torse/jambes) s'additionne et s'affiche sous forme de silhouette, à côté d'une silhouette de localisation qui indique quel jet touche quel membre.",
      ],
    },
    {
      title: "Pouvoirs psy et activation",
      paragraphs: [
        "Chaque pouvoir possédé peut être activé « à la demande » via un bouton dédié (réservé au propriétaire du personnage ou au MJ). Choisissez un palier — 10 (gratuit), 15, 20, 25, 30 ou 35 — tous restent sélectionnables quel que soit votre score : la réussite se joue au dé (score + palier, puis un jet de 1 à 10, comparés au seuil du pouvoir), le total « avant jet » est affiché pour vous aider à choisir.",
        "Activer un pouvoir décompte automatiquement son coût en PSP (0 au palier 10, puis +1 par palier de 5 jusqu'à 5 PSP au palier 35) ; désactiver le pouvoir rembourse ce même coût.",
        "Pour un pouvoir qui modifie une caractéristique ou une compétence, un « effet » optionnel (replié par défaut derrière un bouton) permet de choisir la cible et la valeur du bonus/malus à l'activation. Ce bonus est mis en évidence à l'endroit concerné (badge sur l'attribut ou la compétence visée) et signalé par une icône « ⚡ » sur la tuile du personnage à l'écran « Suivi des constantes » du MJ.",
      ],
    },
    {
      title: "Avantages, inconvénients et équipement",
      paragraphs: [
        "Un avantage coûte des points de budget, un inconvénient en rend — le libellé et la valeur d'un avantage/inconvénient viennent toujours du catalogue de la règle, jamais d'une saisie manuelle. L'équipement est une simple liste de texte libre, sans effet chiffré automatique en dehors de servir de justification pour des modificateurs d'arme ou des compétences gratuites.",
      ],
    },
    {
      title: "Budget de points et XP",
      paragraphs: [
        "Le panneau « Budget de points » résume ce qui alimente votre total disponible (points raciaux + points de départ + XP gagnée) et ce qui en est dépensé (coût des compétences, des pouvoirs psy, net des avantages) — le solde restant s'affiche en évidence, en rouge s'il devient négatif.",
        "Un solde négatif bloque l'enregistrement de la fiche en mode édition tant qu'il n'est pas résolu — soit en ajustant la fiche, soit en demandant au MJ une distribution d'XP ou d'accepter le déficit (bouton « Accepter » du message d'avertissement, qui absorbe le manque dans les points de départ).",
      ],
    },
    {
      title: "Import / export Excel",
      paragraphs: [
        "Chaque fiche peut être exportée vers un classeur Excel (bouton « ⬇︎ Excel ») ou mise à jour depuis un classeur modifié (bouton « ⬆︎ Excel »), utile pour retrouver le format de la fiche papier d'origine ou faire des calculs annexes.",
      ],
    },
  ],
  player: [
    {
      title: "Votre fiche",
      paragraphs: [
        "Vous pouvez consulter et modifier votre propre fiche de personnage (bouton « Modifier » visible dessus), ainsi qu'activer/désactiver vos pouvoirs psy, équiper vos armes/armures et ajuster vos PV/PSP courants, même hors mode édition.",
      ],
    },
    {
      title: "Consulter les fiches de vos coéquipiers",
      paragraphs: [
        "Les fiches des autres personnages de votre/vos groupe(s) sont visibles en lecture seule depuis l'écran « Personnages » — pratique pour vérifier une caractéristique ou un pouvoir d'un coéquipier en séance sans avoir à lui demander.",
      ],
    },
  ],
  gm: [
    {
      title: "Créer et gérer des PNJ",
      paragraphs: [
        "Depuis l'écran « Suivi des constantes », le bouton « + Nouveau PNJ » ouvre un formulaire minimal (nom, photo, race, Vitalité, Volonté) — les PV/PSP maximum suivent le même calcul que pour un personnage de joueur. Un PNJ peut être basculé en personnage joueur (et inversement) depuis l'écran « Personnages ».",
      ],
    },
    {
      title: "Le Suivi des constantes",
      paragraphs: [
        "Cet écran (accessible depuis « Personnages ») affiche en direct les PV/PSP de tous les personnages en jeu (case « En jeu » cochée), leur Rang d'Action, et une icône « ⚡ » si un pouvoir actif les booste. Les boutons Précédent/Suivant font défiler le rang d'action courant du round — « Suivant » reboucle à 0 une fois le rang le plus élevé dépassé.",
        "Le bouton « ⚡ Fin de combat » désactive d'un coup tous les pouvoirs psy actifs des personnages en jeu et leur rembourse leur PSP — pratique pour clore un combat sans repasser sur chaque fiche individuellement.",
      ],
    },
    {
      title: "Distribuer de l'XP",
      paragraphs: [
        "Le bouton « Donner de l'XP » (sur la fiche détaillée ou directement depuis une tuile du Suivi des constantes) permet de créditer ou retirer de l'XP à un personnage. Un montant positif augmente à la fois l'XP gagnée (historique cumulatif) et l'XP disponible ; un montant négatif ne réduit que l'XP disponible.",
      ],
    },
    {
      title: "Approuver les demandes d'adhésion",
      paragraphs: [
        "Les demandes en attente d'un joueur souhaitant rejoindre votre groupe apparaissent en haut de l'écran « Personnages » — les boutons Approuver/Rejeter y répondent directement. Tant qu'une demande n'est pas approuvée, le compte concerné n'a accès à rien du groupe.",
      ],
    },
    {
      title: "Accepter un solde négatif",
      paragraphs: [
        "Si le budget de points d'un personnage devient négatif, le message d'avertissement rouge (visible même hors mode édition) propose un bouton « Accepter » qui absorbe le déficit dans ses points de départ, ramenant le solde à 0 — une alternative à demander au joueur d'ajuster sa fiche.",
      ],
    },
    {
      title: "Personnaliser l'image et le dossier du groupe",
      paragraphs: [
        "Depuis la gestion du groupe, vous pouvez définir une image de fond propre au groupe (affichée sur tous ses écrans) et un lien vers un dossier partagé (Google Drive ou équivalent), affiché en bouton sur l'écran « Personnages ».",
      ],
    },
  ],
};

const EN: GuideContent = {
  common: [
    {
      title: "Logging in and changing language",
      paragraphs: [
        "Log in with the username and password provided by your GM or the platform admin. Once logged in, the \"My profile\" page (linked at the top of every screen) lets you switch the interface language between French and English — the choice is saved on your account and applies from the next page load.",
      ],
    },
    {
      title: "Navigating the app",
      paragraphs: [
        "The home screen lists the groups you belong to — each leads to its own \"Characters\" screen, which lists that group's sheets and gives access to the shared Drive folder if one is set.",
        "From the \"Characters\" screen, clicking a sheet opens it read-only; the \"Edit\" button (shown if you're allowed to) switches fields into edit mode. This documentation page is reachable from each group's \"Characters\" screen, and shows the game rules actually used by that group.",
      ],
    },
    {
      title: "Joining or creating a group",
      paragraphs: [
        "From the \"My profile\" page, you can request to join an existing group — the request stays \"Awaiting GM approval\" until a GM already in that group approves it; you have no access to that group's content before approval. You can cancel a pending request, or leave a group you already belong to.",
        "A GM can also create a new group directly from the same page, picking the game and ruleset used at the table.",
      ],
    },
    {
      title: "The character sheet",
      paragraphs: [
        "Every section of the sheet (Identity, Attributes, Skills, Weapons, Armor, Psychic Powers, Advantages, Equipment, Point budget) is collapsible — click its header to hide or show it, a display-only convenience that doesn't change the sheet.",
        "Hovering the name of a skill, power, or advantage/disadvantage shows a tooltip with its description from the game rules, when available.",
      ],
    },
    {
      title: "Attributes and skills",
      paragraphs: [
        "An attribute total = base score (entered on the sheet) + racial bonus (set by the character's race) + \"tech\" bonus (rare, e.g. cyberware). Clicking an attribute in edit mode shows this breakdown.",
        "A skill is normally picked from the ruleset's catalog (its name encodes the linked attribute, e.g. \"Commandement (COM)\"); its total score = entered score + the linked attribute's total.",
        "A skill can also be marked \"Free (advantage/gear)\" when it's already granted by an advantage and/or gear rather than bought with points — its cost is then excluded from the budget. A free skill accepts several justification lines (\"+ Justification\" button), each carrying its own point contribution that adds up to the base score; since it's usually outside the catalog, its name is typed freely and its linked attribute is chosen manually.",
        "A skill can also be marked \"Affinity\": a pure modifier (no attribute added to its own score, already counted at the target's level) for another skill, a specific psychic power, or an entire psychic discipline — the target is chosen explicitly (\"Skill\"/\"Power\"/\"Discipline\" then the exact name) rather than inferred from the line's name. The bonus is automatically added to its target's total score, highlighted with an amber badge.",
      ],
    },
    {
      title: "Weapons and armor",
      paragraphs: [
        "Only one weapon can be \"equipped\" at a time (checkbox next to its name) — it's the only one that counts toward the Action Rank — except with the \"Ambidextrous\" advantage, which allows equipping two at once; equipping a weapon past that limit automatically unequips the oldest one. Justified modifiers (e.g. an upgrade listed in equipment) can add to a weapon's base values (score, damage, Action Rank) via the \"Modifiers\" button.",
        "Several pieces of armor can be active at once; their protection (VP per body part: head/arms/torso/legs) adds up and is shown as a silhouette, next to a hit-location silhouette showing which roll hits which body part.",
      ],
    },
    {
      title: "Psychic powers and activation",
      paragraphs: [
        "Every power a character has can be activated \"on demand\" via a dedicated button (restricted to the character's owner or a GM). Pick a level — 10 (free), 15, 20, 25, 30, or 35 — all remain selectable regardless of your score: success is rolled for (score + level, then a 1-10 roll, compared to the power's threshold), and the \"total before roll\" is shown to help you choose.",
        "Activating a power automatically deducts its PSP cost (0 at level 10, then +1 per 5-level tier up to 5 PSP at level 35); deactivating refunds that same cost.",
        "For a power that modifies an attribute or a skill, an optional \"effect\" (collapsed by default behind a button) lets you pick the target and the bonus/penalty value at activation. That bonus is highlighted at the relevant spot (a badge on the targeted attribute or skill) and flagged with a \"⚡\" icon on the character's tile on the GM's \"Vitals tracker\" screen.",
      ],
    },
    {
      title: "Advantages, disadvantages and equipment",
      paragraphs: [
        "An advantage costs budget points, a disadvantage gives some back — an advantage/disadvantage's label and value always come from the ruleset's catalog, never from manual entry. Equipment is a simple free-text list, with no automatic numeric effect beyond serving as a justification for weapon modifiers or free skills.",
      ],
    },
    {
      title: "Point budget and XP",
      paragraphs: [
        "The \"Point budget\" panel summarizes what feeds your total available points (racial points + starting points + XP earned) and what's spent from it (skill cost, psychic power cost, net advantages) — the remaining balance is shown prominently, in red if it goes negative.",
        "A negative balance blocks saving the sheet in edit mode until it's resolved — either by adjusting the sheet, or by asking the GM for an XP grant or to accept the deficit (\"Accept\" button on the warning message, which absorbs the shortfall into starting points).",
      ],
    },
    {
      title: "Excel import / export",
      paragraphs: [
        "Every sheet can be exported to an Excel workbook (\"⬇︎ Excel\" button) or updated from a modified workbook (\"⬆︎ Excel\" button) — useful for matching the original paper sheet's layout or doing side calculations.",
      ],
    },
  ],
  player: [
    {
      title: "Your sheet",
      paragraphs: [
        "You can view and edit your own character sheet (\"Edit\" button shown on it), as well as activate/deactivate your psychic powers, equip your weapons/armor, and adjust your current HP/PSP, even outside edit mode.",
      ],
    },
    {
      title: "Viewing your teammates' sheets",
      paragraphs: [
        "Other characters' sheets in your group(s) are visible read-only from the \"Characters\" screen — handy for checking a teammate's attribute or power during a session without having to ask them.",
      ],
    },
  ],
  gm: [
    {
      title: "Creating and managing NPCs",
      paragraphs: [
        "From the \"Vitals tracker\" screen, the \"+ New NPC\" button opens a minimal form (name, photo, race, Vitality, Will) — max HP/PSP follow the same calculation as for a player character. An NPC can be switched to a player character (and back) from the \"Characters\" screen.",
      ],
    },
    {
      title: "The Vitals tracker",
      paragraphs: [
        "This screen (reachable from \"Characters\") shows live HP/PSP for every character in play (\"In play\" checkbox checked), their Action Rank, and a \"⚡\" icon if an active power is boosting them. The Previous/Next buttons step through the round's current action rank — \"Next\" wraps back to 0 once the highest rank in play is passed.",
        "The \"⚡ End combat\" button deactivates every active psychic power for characters in play at once and refunds their PSP — handy for wrapping up a fight without going through every sheet individually.",
      ],
    },
    {
      title: "Granting XP",
      paragraphs: [
        "The \"Give XP\" button (on the detailed sheet or directly from a tile on the Vitals tracker) credits or withdraws XP for a character. A positive amount increases both XP earned (cumulative history) and XP available; a negative amount only reduces XP available.",
      ],
    },
    {
      title: "Approving join requests",
      paragraphs: [
        "Pending requests from a player wanting to join your group appear at the top of the \"Characters\" screen — the Approve/Reject buttons handle them directly. Until approved, the account has no access to anything in the group.",
      ],
    },
    {
      title: "Accepting a negative balance",
      paragraphs: [
        "If a character's point budget goes negative, the red warning message (visible even outside edit mode) offers an \"Accept\" button that absorbs the deficit into their starting points, bringing the balance back to 0 — an alternative to asking the player to adjust their sheet.",
      ],
    },
    {
      title: "Customizing the group's image and folder",
      paragraphs: [
        "From the group's management screen, you can set a background image specific to the group (shown on all its screens) and a link to a shared folder (Google Drive or equivalent), shown as a button on the \"Characters\" screen.",
      ],
    },
  ],
};

const GUIDES: Record<Language, GuideContent> = { fr: FR, en: EN };

export function getPlatformGuide(language: Language): GuideContent {
  return GUIDES[language] ?? FR;
}
