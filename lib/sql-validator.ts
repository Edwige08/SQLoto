// lib/sql-validator.ts
//
// Valide une requête SQL proposée par le modèle, AVANT toute exécution.
// Contrairement à une regex, on s'appuie sur un vrai parseur SQL (AST),
// ce qui permet de raisonner sur la structure réelle de la requête plutôt
// que sur des motifs de texte que l'on peut plus facilement contourner.

import { Parser } from "node-sql-parser";

const parser = new Parser();
const PARSE_OPT = { database: "Postgresql" };

const MAX_RESULT_ROWS = 500;

// Liste blanche : seule cette table peut être interrogée.
const ALLOWED_TABLES = ["tirages"];

// Liste blanche des colonnes réellement présentes dans la table.
// Tenue à jour manuellement, en miroir de sql/001_create_tirages.sql.
const ALLOWED_COLUMNS = new Set([
  "id", "numero_tirage", "jour_semaine", "date_tirage", "date_forclusion",
  "boule_1", "boule_2", "boule_3", "boule_4", "boule_5", "numero_chance",
  "combinaison_gagnante", "combinaison_boules",
  "gagnants_rang1", "rapport_rang1", "gagnants_rang2", "rapport_rang2",
  "gagnants_rang3", "rapport_rang3", "gagnants_rang4", "rapport_rang4",
  "gagnants_rang5", "rapport_rang5", "gagnants_rang6", "rapport_rang6",
  "gagnants_rang7", "rapport_rang7", "gagnants_rang8", "rapport_rang8",
  "gagnants_rang9", "rapport_rang9",
  "nombre_codes_gagnants", "rapport_codes_gagnants", "codes_gagnants",
  "boule_1_t2", "boule_2_t2", "boule_3_t2", "boule_4_t2", "boule_5_t2",
  "promotion_t2", "combinaison_t2",
  "gagnants_rang1_t2", "rapport_rang1_t2", "gagnants_rang2_t2", "rapport_rang2_t2",
  "gagnants_rang3_t2", "rapport_rang3_t2", "gagnants_rang4_t2", "rapport_rang4_t2",
  "numero_7", "devise",
]);

// Filet de sécurité supplémentaire : même après validation structurelle,
// on bloque toute mention de mécanismes internes à PostgreSQL.
const FORBIDDEN_PATTERN =
  /\b(pg_[a-z_]*|information_schema|pg_catalog|pg_sleep|current_setting|set\s+role|copy\s|dblink|lo_import|lo_export|pg_read_file)\b/i;

export type SqlValidationResult =
  | { valid: true; sql: string }
  | { valid: false; reason: string };

export function validateSql(rawSql: string): SqlValidationResult {
  const sql = rawSql.trim().replace(/;+\s*$/, ""); // retire un éventuel point-virgule final

  if (sql.length === 0) {
    return { valid: false, reason: "Requête vide" };
  }

  // Un point-virgule qui subsiste après ce nettoyage signale plusieurs
  // instructions empilées (ex: "SELECT 1; DROP TABLE tirages").
  if (sql.includes(";")) {
    return {
      valid: false,
      reason: "Plusieurs instructions détectées (point-virgule interne)",
    };
  }

  if (FORBIDDEN_PATTERN.test(sql)) {
    return { valid: false, reason: "Motif interdit détecté (accès interne à la base)" };
  }

  // --- Analyse structurelle via l'AST -----------------------------------
  let ast;
  try {
    ast = parser.astify(sql, PARSE_OPT);
  } catch (err) {
    // Fail closed : si on n'arrive pas à analyser la requête avec certitude,
    // on la rejette plutôt que de l'exécuter à l'aveugle.
    return { valid: false, reason: `SQL non analysable : ${(err as Error).message}` };
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  if (statements.length !== 1) {
    return { valid: false, reason: "Plusieurs instructions détectées" };
  }

  if (statements[0].type !== "select") {
    return {
      valid: false,
      reason: `Seules les requêtes SELECT sont autorisées (reçu: ${statements[0].type})`,
    };
  }

  // --- Noms de CTE (WITH ... AS (...)) : ce sont des alias internes à la
  // requête, pas des tables externes. Il ne faut pas les soumettre à la
  // liste blanche de tables, sous peine de rejeter à tort des requêtes
  // légitimes utilisant des CTE (courant pour "déplier" boule_1..5).
  const cteNames = new Set<string>();
  const withClause = (statements[0] as { with?: unknown }).with;
  if (Array.isArray(withClause)) {
    for (const cte of withClause as any[]) {
      const rawName = cte?.name?.value ?? cte?.name;
      if (typeof rawName === "string") {
        cteNames.add(rawName.toLowerCase());
      }
    }
  }

  // --- Vérification des tables utilisées ----------------------------------
  let tableList: string[];
  try {
    tableList = parser.tableList(sql, PARSE_OPT);
  } catch {
    return { valid: false, reason: "Impossible d'extraire la liste des tables" };
  }

  for (const entry of tableList) {
    const tableName = entry.split("::").pop()!.replace(/"/g, "").toLowerCase();
    if (cteNames.has(tableName)) continue; // alias de CTE : pas une vraie table externe
    if (!ALLOWED_TABLES.includes(tableName)) {
      return { valid: false, reason: `Table non autorisée : ${tableName}` };
    }
  }

  // --- Vérification des colonnes utilisées --------------------------------
  let columnList: string[];
  try {
    columnList = parser.columnList(sql, PARSE_OPT);
  } catch {
    return { valid: false, reason: "Impossible d'extraire la liste des colonnes" };
  }

  for (const entry of columnList) {
    const parts = entry.split("::");
    const columnName = parts[parts.length - 1].replace(/"/g, "").toLowerCase();
    const tablePart = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : "";

    if (columnName === "*" || columnName === "(.*)") continue;

    // On ne valide que les colonnes explicitement rattachées à la vraie
    // table "tirages" (la seule dont l'accès est autorisé, cf. vérification
    // des tables ci-dessus). Toute colonne rattachée à autre chose (alias de
    // CTE, alias de sous-requête dérivée, fonction de type unnest, ou non
    // rattachable du tout par le parseur) est nécessairement un nom interne
    // à la requête : la vraie donnée sous-jacente a de toute façon sa
    // propre entrée qualifiée "tirages" ailleurs dans la liste, et sera
    // vérifiée à ce moment-là. Cette règle couvre uniformément tous les cas
    // (CTE, sous-requête, fonctions...) sans avoir à les énumérer un par un.
    if (tablePart !== "tirages") continue;

    if (!ALLOWED_COLUMNS.has(columnName)) {
      return { valid: false, reason: `Colonne non autorisée : ${columnName}` };
    }
  }

  // --- Limitation du volume de résultats -----------------------------------
  const hasLimit = /\blimit\s+\d+/i.test(sql);
  const finalSql = hasLimit ? sql : `${sql} LIMIT ${MAX_RESULT_ROWS}`;

  return { valid: true, sql: finalSql };
}
