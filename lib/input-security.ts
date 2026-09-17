const MAX_QUESTION_LENGTH = 300;

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