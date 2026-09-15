// scripts/test-nl-to-sql.ts
//
// Script de test manuel pour la fonction generateSqlFromQuestion.
// Usage : pnpm exec tsx scripts/test-nl-to-sql.ts "ta question ici"

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateSqlFromQuestion } from "../lib/nl-to-sql";

async function main() {
  const question =
    process.argv[2] ?? "Quel numéro est le plus fréquent le mercredi ?";

  console.log("Question posée :", question);
  console.log("Appel à l'API en cours...");

  const result = await generateSqlFromQuestion(question);

  console.log("\n--- Résultat ---");
  console.log("Statut       :", result.status);
  console.log("SQL proposé  :", result.sql);
  console.log("Message      :", result.message);
  console.log("Modèle utilisé :", result.modelUsed);
  console.log("\n--- Réponse brute du modèle ---");
  console.log(result.rawResponse);
}

main().catch((err) => {
  console.error("Erreur pendant le test :", err);
  process.exit(1);
});