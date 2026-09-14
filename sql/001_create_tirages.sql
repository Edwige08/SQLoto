-- sql/001_create_tirages.sql
-- Schéma couvrant l'intégralité des colonnes du CSV FDJ (hors colonne fantôme finale).

CREATE TABLE tirages (
  id SERIAL PRIMARY KEY,

  -- Identification du tirage
  numero_tirage INTEGER NOT NULL UNIQUE,      -- annee_numero_de_tirage
  jour_semaine TEXT NOT NULL,                 -- nettoyé : trim + uppercase
  date_tirage DATE NOT NULL,
  date_forclusion DATE,

  -- Tirage principal
  boule_1 SMALLINT NOT NULL CHECK (boule_1 BETWEEN 1 AND 49),
  boule_2 SMALLINT NOT NULL CHECK (boule_2 BETWEEN 1 AND 49),
  boule_3 SMALLINT NOT NULL CHECK (boule_3 BETWEEN 1 AND 49),
  boule_4 SMALLINT NOT NULL CHECK (boule_4 BETWEEN 1 AND 49),
  boule_5 SMALLINT NOT NULL CHECK (boule_5 BETWEEN 1 AND 49),
  numero_chance SMALLINT NOT NULL CHECK (numero_chance BETWEEN 1 AND 10),
  combinaison_gagnante TEXT,

  -- Gains par rang (tirage principal)
  gagnants_rang1 INTEGER, rapport_rang1 NUMERIC(12,2),
  gagnants_rang2 INTEGER, rapport_rang2 NUMERIC(12,2),
  gagnants_rang3 INTEGER, rapport_rang3 NUMERIC(12,2),
  gagnants_rang4 INTEGER, rapport_rang4 NUMERIC(12,2),
  gagnants_rang5 INTEGER, rapport_rang5 NUMERIC(12,2),
  gagnants_rang6 INTEGER, rapport_rang6 NUMERIC(12,2),
  gagnants_rang7 INTEGER, rapport_rang7 NUMERIC(12,2),
  gagnants_rang8 INTEGER, rapport_rang8 NUMERIC(12,2),
  gagnants_rang9 INTEGER, rapport_rang9 NUMERIC(12,2),

  -- Codes gagnants
  nombre_codes_gagnants INTEGER,
  rapport_codes_gagnants NUMERIC(12,2),
  codes_gagnants TEXT,

  -- Second tirage (souvent partiellement vide dans le CSV)
  boule_1_t2 SMALLINT CHECK (boule_1_t2 BETWEEN 1 AND 49),
  boule_2_t2 SMALLINT CHECK (boule_2_t2 BETWEEN 1 AND 49),
  boule_3_t2 SMALLINT CHECK (boule_3_t2 BETWEEN 1 AND 49),
  boule_4_t2 SMALLINT CHECK (boule_4_t2 BETWEEN 1 AND 49),
  boule_5_t2 SMALLINT CHECK (boule_5_t2 BETWEEN 1 AND 49),
  promotion_t2 TEXT,
  combinaison_t2 TEXT,

  gagnants_rang1_t2 INTEGER, rapport_rang1_t2 NUMERIC(12,2),
  gagnants_rang2_t2 INTEGER, rapport_rang2_t2 NUMERIC(12,2),
  gagnants_rang3_t2 INTEGER, rapport_rang3_t2 NUMERIC(12,2),
  gagnants_rang4_t2 INTEGER, rapport_rang4_t2 NUMERIC(12,2),

  -- Divers
  numero_7 TEXT,   -- garde les zéros non significatifs (ex: '0936035')
  devise TEXT
);

CREATE INDEX idx_tirages_date ON tirages (date_tirage);
CREATE INDEX idx_tirages_jour ON tirages (jour_semaine);
