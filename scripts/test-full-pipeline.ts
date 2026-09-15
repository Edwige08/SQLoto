// scripts/test-full-pipeline.ts
//
// Test de bout en bout : question en langage naturel -> SQL proposé par le
// LLM -> validation structurelle -> exécution en lecture seule.
// Usage : pnpm exec tsx scripts/test-full-pipeline.ts "ta question"

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateSqlFromQuestion } from "../lib/nl-to-sql";
import { runValidatedQuery } from "../lib/execute-sql";
import { formatFinalAnswer } from "../lib/format-answer";

async function main() {
  const question =
    process.argv[2] ?? "Combien de fois le numéro 12 est-il sorti depuis janvier ?";

  console.log("Question :", question);
  console.log("\n[1/3] Génération du SQL par le modèle...");
  const generation = await generateSqlFromQuestion(question);

  console.log("  status      :", generation.status);
  console.log("  sql proposé :", generation.sql);
  console.log("  message     :", generation.message);
  console.log("  modèle      :", generation.modelUsed);

  if (generation.status !== "ok" || !generation.sql) {
    console.log("\nPas de SQL à exécuter (statut != 'ok'). Fin du test.");
    return;
  }

  console.log("\n[2/3] Validation + exécution...");
  const execution = await runValidatedQuery(generation.sql);

  if (!execution.success) {
    console.log("  ÉCHEC :", execution.reason);
    console.log(
      "\n  Rappel : le modèle a proposé du SQL, mais il n'a jamais été exécuté tel quel."
    );
    return;
  }

  console.log("[3/3] Résultat brut");
  console.log("  SQL réellement exécuté :", execution.sqlExecuted);
  console.log("  Nombre de lignes       :", execution.rows.length);
  console.log("  Aperçu                 :", execution.rows.slice(0, 5));

  console.log("\n[4/4] Mise en forme de la réponse finale...");
  const finalAnswer = await formatFinalAnswer(
    question,
    execution.sqlExecuted,
    execution.rows
  );
  console.log("  Réponse         :", finalAnswer.reponse);
  console.log("  Résumé données  :", finalAnswer.resumeDonnees);
  console.log("  Limites         :", finalAnswer.limites);
  console.log("  Modèle utilisé  :", finalAnswer.modelUsed);
}

main().catch((err) => {
  console.error("Erreur pendant le test :", err);
  process.exit(1);
});
