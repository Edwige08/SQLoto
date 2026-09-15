// Exécute une requête SQL déjà validée par sql-validator.ts, sur une
// connexion PostgreSQL dédiée au rôle en lecture seule (chatbot_readonly).
// Cette fonction ne doit JAMAIS être appelée avec une chaîne SQL qui n'est
// pas passée par validateSql() au préalable.

import { Pool, types } from "pg";
import { validateSql } from "./sql-validator";

// PostgreSQL n'associe aucune heure ni fuseau horaire à une colonne DATE.
// Par défaut, node-postgres la convertit pourtant en objet Date JavaScript,
// construit en heure LOCALE de la machine qui exécute le code — ce qui peut
// décaler l'affichage d'un jour selon le fuseau (ex: UTC+1 en hiver en
// France). On désactive cette conversion : une DATE reste une chaîne
// "YYYY-MM-DD" telle quelle, sans ambiguïté possible.
types.setTypeParser(types.builtins.DATE, (value) => value);

// Pool séparé de celui utilisé par le script d'import : credentials
// différents (rôle en lecture seule uniquement).
//
// Créé à la demande (et non au chargement du module) : avec les modules ES,
// tous les `import` sont hissés et exécutés avant le reste du code d'un
// fichier, y compris un éventuel dotenv.config() écrit "avant" dans le texte
// d'un script appelant. Instancier le Pool immédiatement ici risquerait donc
// de le faire tourner avec des variables d'environnement pas encore chargées.
let readOnlyPool: Pool | null = null;

function getReadOnlyPool(): Pool {
  if (!readOnlyPool) {
    readOnlyPool = new Pool({
      connectionString: process.env.DATABASE_URL_READONLY,
    });
  }
  return readOnlyPool;
}

const STATEMENT_TIMEOUT_MS = 3000; // 3 secondes maximum par requête

export type ExecutionResult =
  | { success: true; rows: Record<string, unknown>[]; sqlExecuted: string }
  | { success: false; reason: string };

export async function runValidatedQuery(
  candidateSql: string
): Promise<ExecutionResult> {
  // Barrière 1 : la validation structurelle (jamais contournable, même
  // si cette fonction est appelée directement sans repasser par le LLM).
  const validation = validateSql(candidateSql);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const client = await getReadOnlyPool().connect();
  try {
    await client.query("BEGIN");
    // SET LOCAL n'a d'effet que dans la transaction courante : la requête
    // suivante est automatiquement interrompue si elle dépasse ce délai.
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

    const result = await client.query(validation.sql);

    await client.query("COMMIT");

    return {
      success: true,
      rows: result.rows,
      sqlExecuted: validation.sql,
    };
  } catch (err) {
    await client.query("ROLLBACK");

    // Barrière 2, la vraie ceinture de sécurité : même si toute la validation
    // ci-dessus avait un trou, le rôle "chatbot_readonly" n'a physiquement
    // pas le droit d'écrire en base. Une tentative d'écriture échouerait ici
    // avec une erreur de permission PostgreSQL, jamais silencieusement.
    return {
      success: false,
      reason: `Erreur d'exécution : ${(err as Error).message}`,
    };
  } finally {
    client.release();
  }
}
