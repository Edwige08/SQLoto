// lib/pipeline.ts
//
// Orchestrateur central : enchaîne génération SQL, validation, exécution et
// mise en forme de la réponse, en journalisant chaque étape clé. C'est le
// seul point d'entrée que les scripts de test et la future route API
// Next.js doivent appeler — la logique métier ne doit pas être dupliquée
// à chaque endroit qui a besoin de répondre à une question.

import { generateSqlFromQuestion } from "./nl-to-sql";
import { runValidatedQuery } from "./execute-sql";
import { formatFinalAnswer } from "./format-answer";
import {
  ConversationState,
  EMPTY_CONVERSATION,
  addTurn,
  maybeSummarize,
} from "./conversation";
import { logInteraction } from "./logger";

export interface PipelineDebugInfo {
  modelUsed: string | null;
  sqlExecuted: string | null;
  dureeGenerationMs: number;
  dureeExecutionMs: number | null;
}

export interface PipelineResult {
  reponse: string;
  conversation: ConversationState;
  debug: PipelineDebugInfo;
}

export async function answerQuestion(
  question: string,
  conversation: ConversationState = EMPTY_CONVERSATION
): Promise<PipelineResult> {
  const genStart = Date.now();

  let generation;
  try {
    generation = await generateSqlFromQuestion(question, conversation);
  } catch (err) {
    // Tous les modèles candidats ont échoué (cf. Partie 2) : on journalise
    // l'échec complet, et on répond honnêtement plutôt que de planter.
    await logInteraction({
      questionUtilisateur: question,
      modeleUtilise: null,
      sortieBruteModele: null,
      sqlPropose: null,
      validationResultat: "non_applicable",
      raisonRefus: null,
      dureeGenerationMs: Date.now() - genStart,
      dureeExecutionMs: null,
      tokensConsommes: null,
      nombreLignesResultat: null,
      reponseFinale: null,
      erreur: (err as Error).message,
    });
    return {
      reponse:
        "Je rencontre un problème technique pour traiter ta question. Réessaie dans un instant.",
      conversation,
      debug: {
        modelUsed: null,
        sqlExecuted: null,
        dureeGenerationMs: Date.now() - genStart,
        dureeExecutionMs: null,
      },
    };
  }
  const dureeGenerationMs = Date.now() - genStart;

  // Cas "pas de SQL à exécuter" : question ambiguë, hors périmètre, ou
  // tentative bloquée pour raison de sécurité.
  if (generation.status !== "ok" || !generation.sql) {
    await logInteraction({
      questionUtilisateur: question,
      modeleUtilise: generation.modelUsed,
      sortieBruteModele: generation.rawResponse,
      sqlPropose: null,
      validationResultat: "non_applicable",
      raisonRefus: generation.status,
      dureeGenerationMs,
      dureeExecutionMs: null,
      tokensConsommes: generation.tokensUsed,
      nombreLignesResultat: null,
      reponseFinale: generation.message,
      erreur: null,
    });

    const reponse = generation.message ?? "Je n'ai pas compris cette question.";
    let updated = addTurn(conversation, "user", question);
    updated = addTurn(updated, "assistant", reponse);

    return {
      reponse,
      conversation: await maybeSummarize(updated),
      debug: {
        modelUsed: generation.modelUsed,
        sqlExecuted: null,
        dureeGenerationMs,
        dureeExecutionMs: null,
      },
    };
  }

  // --- SQL proposé : validation + exécution ---------------------------------
  const execStart = Date.now();
  const execution = await runValidatedQuery(generation.sql);
  const dureeExecutionMs = Date.now() - execStart;

  if (!execution.success) {
    // Le modèle a proposé du SQL, mais il n'a pas passé la validation
    // (Partie 4). On journalise la raison précise du refus : c'est
    // exactement le genre d'info qui permet de détecter un modèle
    // systématiquement problématique, ou une règle de validation trop stricte.
    await logInteraction({
      questionUtilisateur: question,
      modeleUtilise: generation.modelUsed,
      sortieBruteModele: generation.rawResponse,
      sqlPropose: generation.sql,
      validationResultat: "invalide",
      raisonRefus: execution.reason,
      dureeGenerationMs,
      dureeExecutionMs,
      tokensConsommes: generation.tokensUsed,
      nombreLignesResultat: null,
      reponseFinale: null,
      erreur: null,
    });

    return {
      reponse:
        "Je n'ai pas pu traiter cette requête en toute sécurité. Peux-tu reformuler ta question ?",
      conversation,
      debug: {
        modelUsed: generation.modelUsed,
        sqlExecuted: generation.sql,
        dureeGenerationMs,
        dureeExecutionMs,
      },
    };
  }

  // --- Succès complet : mise en forme + journalisation ------------------------
  const finalAnswer = await formatFinalAnswer(
    question,
    execution.sqlExecuted,
    execution.rows
  );

  await logInteraction({
    questionUtilisateur: question,
    modeleUtilise: generation.modelUsed,
    sortieBruteModele: generation.rawResponse,
    sqlPropose: execution.sqlExecuted,
    validationResultat: "valide",
    raisonRefus: null,
    dureeGenerationMs,
    dureeExecutionMs,
    tokensConsommes: generation.tokensUsed,
    nombreLignesResultat: execution.rows.length,
    reponseFinale: finalAnswer.reponse,
    erreur: null,
  });

  let updated = addTurn(conversation, "user", question);
  updated = addTurn(updated, "assistant", finalAnswer.reponse);

  return {
    reponse: finalAnswer.reponse,
    conversation: await maybeSummarize(updated),
    debug: {
      modelUsed: generation.modelUsed,
      sqlExecuted: execution.sqlExecuted,
      dureeGenerationMs,
      dureeExecutionMs,
    },
  };
}
