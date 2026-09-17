// scripts/test-conversation.ts
//
// Simule une conversation à plusieurs tours en passant par le pipeline
// centralisé (lib/pipeline.ts), qui journalise chaque échange.
// Usage : pnpm exec tsx scripts/test-conversation.ts

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { answerQuestion } from "../lib/pipeline";
import { ConversationState, EMPTY_CONVERSATION } from "../lib/conversation";

async function ask(
  question: string,
  conversation: ConversationState
): Promise<ConversationState> {
  console.log(`\n=== Utilisateur : ${question} ===`);
  const result = await answerQuestion(question, conversation);
  console.log("  Assistant :", result.reponse);
  return result.conversation;
}

async function main() {
  let conversation = EMPTY_CONVERSATION;

  conversation = await ask(
    "Quel numéro est le plus fréquent en 2024 ?",
    conversation
  );

  conversation = await ask(
    "Et sur les cinquante derniers tirages ?",
    conversation
  );

  console.log("\n--- État final de la conversation ---");
  console.log("Résumé      :", conversation.summary);
  console.log("Tours gardés:", conversation.recentTurns.length);
}

main().catch((err) => {
  console.error("Erreur pendant le test :", err);
  process.exit(1);
});
