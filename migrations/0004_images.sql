-- Images pour les jeux, règles et groupes de joueurs (admin), et
-- rattachement de l'image ADD40K existante (public/background.jpg) au
-- groupe "add40k" uniquement — elle n'est plus un fond d'écran en dur pour
-- toute l'app, seulement pour ce groupe (cf. src/worker/lib/reference.ts,
-- src/frontend/pages/CharacterList.tsx et consorts).

ALTER TABLE games ADD COLUMN image_url TEXT;
ALTER TABLE rulesets ADD COLUMN image_url TEXT;
ALTER TABLE player_groups ADD COLUMN image_url TEXT;

UPDATE player_groups SET image_url = '/background.jpg' WHERE id = 'add40k';
UPDATE games SET image_url = '/background.jpg' WHERE id = 'add40k';
