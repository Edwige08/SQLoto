// lib/openrouter-config.ts
//
// Constantes partagées entre tous les modules qui appellent l'API OpenRouter
// (génération SQL, mise en forme de réponse, résumé de conversation...).
// Centralisées ici pour éviter les dépendances circulaires entre ces modules.

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Délai maximal avant d'abandonner un appel et de basculer vers le modèle
// candidat suivant. Choisi à partir de durées réellement observées en
// journalisation (Partie 8) : la plupart des appels répondent en 1 à 10s,
// mais on a mesuré des pics jusqu'à ~21s sur des modèles "raisonneurs".
// 20s laisse une marge raisonnable sans bloquer l'utilisateur indéfiniment
// si un fournisseur est en train de mal répondre.
export const REQUEST_TIMEOUT_MS = 20_000;

// Wrapper autour de fetch() avec annulation automatique après timeoutMs,
// via AbortController (mécanisme standard du navigateur/Node, pas une
// bibliothèque tierce). Utilisé par tous les modules qui appellent OpenRouter.
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Liste de modèles gratuits candidats, essayés dans l'ordre en cas d'échec
// (limite de débit, panne fournisseur, etc.). Vérifiée en direct via
// scripts/list-free-models.ts — à réévaluer si l'un d'eux disparaît de l'offre gratuite.
export const CANDIDATE_MODELS = [
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nex-agi/nex-n2.5-mini:free",
  "nex-agi/nex-n2.5-pro:free",
  "liquid/lfm-2.5-2.6b:free",
];
