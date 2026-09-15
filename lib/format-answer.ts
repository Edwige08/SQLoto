// lib/format-answer.ts
//
// Transforme le résultat brut d'une requête SQL déjà exécutée en une
// réponse compréhensible en langage naturel. Le modèle ne doit JAMAIS
// inventer une information absente du résultat fourni : son rôle ici est
// purement rédactionnel, pas analytique. Toute donnée qu'il cite doit
// pouvoir se retrouver telle quelle dans le résultat qu'on lui a donné.

import { OPENROUTER_URL, CANDIDATE_MODELS } from "./nl-to-sql";

// On ne montre jamais plus de N lignes au modèle, pour deux raisons :
// éviter un gaspillage de tokens sur un résultat déjà large, et éviter
// qu'un modèle "raisonneur" épuise son budget avant d'écrire sa réponse
// (cf. les pannes rencontrées en Partie 2).
const MAX_ROWS_SHOWN_TO_MODEL = 30;

const RESPONSE_JSON_SCHEMA = {
  name: "final_answer_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      reponse: {
        type: "string",
        description:
          "Réponse en langage naturel à la question posée, basée uniquement sur le résultat fourni. Concise (1 à 3 phrases).",
      },
      resume_donnees: {
        type: "string",
        description:
          "Rappel factuel court des données utilisées pour répondre (valeurs exactes issues du résultat, sans arrondi ni reformulation qui en changerait le sens).",
      },
      limites: {
        type: ["string", "null"],
        description:
          "Limite éventuelle à signaler (résultat tronqué, aucune donnée trouvée, période non précisée par l'utilisateur...), ou null si aucune.",
      },
    },
    required: ["reponse", "resume_donnees", "limites"],
    additionalProperties: false,
  },
};

export interface FinalAnswer {
  reponse: string;
  resumeDonnees: string;
  limites: string | null;
  modelUsed: string;
}

function buildSystemPrompt(totalRowCount: number, rowsShown: number): string {
  const truncationNote =
    rowsShown < totalRowCount
      ? `Attention : seules les ${rowsShown} premières lignes sur ${totalRowCount} au total te sont montrées ci-dessous. Signale-le explicitement dans "limites" si la question porte sur un classement ou un décompte complet.`
      : "";

  return `Tu rédiges la réponse finale d'un chatbot d'exploration des tirages du Loto français, à partir d'un résultat déjà obtenu et validé depuis la base de données.

Règles absolues, sans exception :
- N'invente jamais un chiffre, une date, un numéro ou un fait qui n'apparaît pas explicitement dans le résultat fourni.
- Si le résultat est une liste vide, dis-le clairement : aucune donnée ne correspond à la question. Ne comble jamais ce vide par une supposition.
- Reprends fidèlement les valeurs exactes du résultat, sans les arrondir ni les reformuler d'une façon qui en changerait le sens.
- Reste concise : 1 à 3 phrases pour la réponse principale.
${truncationNote}

Réponds uniquement au format JSON demandé, sans texte additionnel.`;
}

function buildUserMessage(
  question: string,
  sqlExecuted: string,
  rowsShown: Record<string, unknown>[]
): string {
  return `<question_utilisateur>
${question}
</question_utilisateur>

<requete_sql_executee>
${sqlExecuted}
</requete_sql_executee>

<resultat_de_la_base>
${JSON.stringify(rowsShown)}
</resultat_de_la_base>`;
}

export async function formatFinalAnswer(
  question: string,
  sqlExecuted: string,
  rows: Record<string, unknown>[]
): Promise<FinalAnswer> {
  const rowsShown = rows.slice(0, MAX_ROWS_SHOWN_TO_MODEL);
  const systemPrompt = buildSystemPrompt(rows.length, rowsShown.length);
  const userMessage = buildUserMessage(question, sqlExecuted, rowsShown);

  const echecs: string[] = [];

  for (const model of CANDIDATE_MODELS) {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2, // un peu plus haut que pour le SQL : ici on veut une phrase naturelle, pas juste une traduction mécanique
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: RESPONSE_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      echecs.push(`${model} -> HTTP ${response.status}`);
      continue;
    }

    const data = await response.json();

    if (data.error) {
      echecs.push(`${model} -> Erreur fournisseur: ${data.error.message}`);
      continue;
    }

    const rawContent: string = data.choices?.[0]?.message?.content ?? "";
    if (!rawContent) {
      echecs.push(`${model} -> Réponse vide`);
      continue;
    }

    try {
      const parsed = JSON.parse(rawContent);
      if (typeof parsed.reponse !== "string" || !parsed.reponse.trim()) {
        echecs.push(`${model} -> Champ "reponse" manquant ou vide`);
        continue;
      }
      return {
        reponse: parsed.reponse,
        resumeDonnees: parsed.resume_donnees ?? "",
        limites: parsed.limites ?? null,
        modelUsed: data.model ?? model,
      };
    } catch {
      echecs.push(`${model} -> JSON invalide`);
      continue;
    }
  }

  // Filet de repli ultime : même si TOUS les modèles échouent à rédiger une
  // belle phrase, l'utilisateur doit recevoir quelque chose d'exploitable
  // plutôt qu'une erreur brute. On ne perd jamais les données déjà obtenues
  // de la base, même si leur mise en forme échoue.
  console.warn(`[format-answer] Tous les modèles ont échoué : ${echecs.join(" | ")}`);
  return {
    reponse:
      rows.length === 0
        ? "Aucun résultat trouvé pour cette question."
        : `Résultat obtenu (${rows.length} ligne(s)), mais la mise en forme automatique a échoué. Voici les données brutes : ${JSON.stringify(rows.slice(0, 10))}`,
    resumeDonnees: `${rows.length} ligne(s) issues de la base`,
    limites: "La rédaction automatique de la réponse a échoué ; données brutes affichées à la place.",
    modelUsed: "aucun (repli local)",
  };
}
