-- Préférence de langue d'affichage par compte (cf. shared/types.ts
-- Language/PublicUser.language), sélectionnable sur la page Profil.
-- "fr" par défaut : l'app est nativement en français, ce défaut ne change
-- rien pour les comptes existants tant qu'ils ne choisissent pas une autre
-- langue. Première langue additionnelle : "en" (anglais).
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'));
