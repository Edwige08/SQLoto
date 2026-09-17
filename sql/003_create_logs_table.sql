-- sql/003_create_logs_table.sql
--
-- Journal des interactions avec le chatbot. Permet de comprendre a posteriori
-- pourquoi une réponse incorrecte a été produite (question posée, modèle
-- utilisé, SQL proposé, résultat de la validation, temps de réponse...).
-- Ne contient jamais de secret ni de clé API.

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  question_utilisateur TEXT NOT NULL,
  modele_utilise TEXT,
  sortie_brute_modele TEXT,
  sql_propose TEXT,

  -- 'valide' | 'invalide' | 'non_applicable' (ex: question hors périmètre,
  -- ambiguë, ou refusée avant même d'atteindre l'étape de validation SQL)
  validation_resultat TEXT,
  raison_refus TEXT,

  duree_generation_ms INTEGER,
  duree_execution_ms INTEGER,
  tokens_consommes INTEGER,
  nombre_lignes_resultat INTEGER,

  reponse_finale TEXT,
  erreur TEXT
);

CREATE INDEX idx_logs_created_at ON logs (created_at);
