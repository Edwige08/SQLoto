// lib/logger.ts
//
// Enregistre chaque interaction avec le chatbot dans la table "logs", pour
// pouvoir comprendre a posteriori pourquoi une réponse incorrecte a été
// produite. Ne stocke jamais de clé API ni de secret.

import { Pool } from "pg";

// Créé à la demande, pas au chargement du module — cf. le piège de l'ordre
// des imports ES rencontré en Partie 4 avec execute-sql.ts.
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export interface LogEntry {
  questionUtilisateur: string;
  modeleUtilise: string | null;
  sortieBruteModele: string | null;
  sqlPropose: string | null;
  validationResultat: "valide" | "invalide" | "non_applicable";
  raisonRefus: string | null;
  dureeGenerationMs: number | null;
  dureeExecutionMs: number | null;
  tokensConsommes: number | null;
  nombreLignesResultat: number | null;
  reponseFinale: string | null;
  erreur: string | null;
}

export async function logInteraction(entry: LogEntry): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO logs (
        question_utilisateur, modele_utilise, sortie_brute_modele, sql_propose,
        validation_resultat, raison_refus, duree_generation_ms, duree_execution_ms,
        tokens_consommes, nombre_lignes_resultat, reponse_finale, erreur
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.questionUtilisateur,
        entry.modeleUtilise,
        entry.sortieBruteModele,
        entry.sqlPropose,
        entry.validationResultat,
        entry.raisonRefus,
        entry.dureeGenerationMs,
        entry.dureeExecutionMs,
        entry.tokensConsommes,
        entry.nombreLignesResultat,
        entry.reponseFinale,
        entry.erreur,
      ]
    );
  } catch (err) {
    // Principe important : un échec de journalisation ne doit JAMAIS faire
    // planter l'application elle-même. On se contente de le signaler sur
    // la console — le chatbot continue de répondre à l'utilisateur.
    console.error("[logger] Échec de l'écriture du log :", err);
  }
}
