// Première barrière de sécurité : des vérifications sur l'entrée utilisateur
// AVANT même d'appeler le modèle. Contrairement aux règles données dans le
// prompt (que le modèle peut choisir d'ignorer), ces vérifications sont
// déterministes et ne dépendent d'aucune "bonne volonté" du LLM.

const MAX_QUESTION_LENGTH = 300; // largement suffisant pour une question sur le Loto

// Liste de motifs clairement anormaux pour ce cas d'usage précis.
// Aucune question légitime sur des tirages de Loto n'a besoin de contenir
// ces expressions : leur présence est un signal fort de tentative de
// manipulation, pas un faux positif probable.
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore.*(instructions|consignes|r[eè]gles)/i,
  /(affiche|donne|montre).*(prompt|invite).*(syst[eè]me)/i,
  /ignore.*syst[eè]me/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /update\s+.*\s+set/i,
  /alter\s+table/i,
  /;\s*--/, // tentative classique d'injection SQL
  /liste.*(table|colonne).*(interne|syst[eè]me)/i,
];

export type ValidationResult =
  | { valid: true; cleaned: string }
  | { valid: false; reason: string };

export function validateUserQuestion(raw: string): ValidationResult {
  const cleaned = raw.trim();

  if (cleaned.length === 0) {
    return { valid: false, reason: "Message vide" };
  }

  if (cleaned.length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      reason: `Message trop long (${cleaned.length} caractères, max ${MAX_QUESTION_LENGTH})`,
    };
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        valid: false,
        reason: `Motif suspect détecté (${pattern.source})`,
      };
    }
  }

  return { valid: true, cleaned };
}