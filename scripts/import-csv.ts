// scripts/import-csv.ts
//
// Script d'import du CSV FDJ vers PostgreSQL (toutes colonnes conservées).
// Usage : npx tsx scripts/import-csv.ts ./data/loto_201911.csv

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- Description des colonnes : CSV -> DB -----------------------------------
//
// type indique comment convertir la valeur texte du CSV.
// required=true => une ligne sans cette valeur (ou invalide) est rejetée.
// transform permet un nettoyage spécifique (ex: jour_de_tirage).

type ColType = "int" | "smallint" | "numeric" | "text" | "date_fr";

interface ColumnDef {
  csv: string;
  db: string;
  type: ColType;
  required?: boolean;
  min?: number;
  max?: number;
  transform?: (raw: string) => string;
}

const COLUMNS: ColumnDef[] = [
  { csv: "annee_numero_de_tirage", db: "numero_tirage", type: "int", required: true },
  {
    csv: "jour_de_tirage",
    db: "jour_semaine",
    type: "text",
    required: true,
    transform: (v) => v.trim().toUpperCase(),
  },
  { csv: "date_de_tirage", db: "date_tirage", type: "date_fr", required: true },
  { csv: "date_de_forclusion", db: "date_forclusion", type: "date_fr" },

  { csv: "boule_1", db: "boule_1", type: "smallint", required: true, min: 1, max: 49 },
  { csv: "boule_2", db: "boule_2", type: "smallint", required: true, min: 1, max: 49 },
  { csv: "boule_3", db: "boule_3", type: "smallint", required: true, min: 1, max: 49 },
  { csv: "boule_4", db: "boule_4", type: "smallint", required: true, min: 1, max: 49 },
  { csv: "boule_5", db: "boule_5", type: "smallint", required: true, min: 1, max: 49 },
  { csv: "numero_chance", db: "numero_chance", type: "smallint", required: true, min: 1, max: 10 },
  { csv: "combinaison_gagnante_en_ordre_croissant", db: "combinaison_gagnante", type: "text" },

  { csv: "nombre_de_gagnant_au_rang1", db: "gagnants_rang1", type: "int" },
  { csv: "rapport_du_rang1", db: "rapport_rang1", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang2", db: "gagnants_rang2", type: "int" },
  { csv: "rapport_du_rang2", db: "rapport_rang2", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang3", db: "gagnants_rang3", type: "int" },
  { csv: "rapport_du_rang3", db: "rapport_rang3", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang4", db: "gagnants_rang4", type: "int" },
  { csv: "rapport_du_rang4", db: "rapport_rang4", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang5", db: "gagnants_rang5", type: "int" },
  { csv: "rapport_du_rang5", db: "rapport_rang5", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang6", db: "gagnants_rang6", type: "int" },
  { csv: "rapport_du_rang6", db: "rapport_rang6", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang7", db: "gagnants_rang7", type: "int" },
  { csv: "rapport_du_rang7", db: "rapport_rang7", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang8", db: "gagnants_rang8", type: "int" },
  { csv: "rapport_du_rang8", db: "rapport_rang8", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang9", db: "gagnants_rang9", type: "int" },
  { csv: "rapport_du_rang9", db: "rapport_rang9", type: "numeric" },

  { csv: "nombre_de_codes_gagnants", db: "nombre_codes_gagnants", type: "int" },
  { csv: "rapport_codes_gagnants", db: "rapport_codes_gagnants", type: "numeric" },
  { csv: "codes_gagnants", db: "codes_gagnants", type: "text" },

  { csv: "boule_1_second_tirage", db: "boule_1_t2", type: "smallint", min: 1, max: 49 },
  { csv: "boule_2_second_tirage", db: "boule_2_t2", type: "smallint", min: 1, max: 49 },
  { csv: "boule_3_second_tirage", db: "boule_3_t2", type: "smallint", min: 1, max: 49 },
  { csv: "boule_4_second_tirage", db: "boule_4_t2", type: "smallint", min: 1, max: 49 },
  { csv: "boule_5_second_tirage", db: "boule_5_t2", type: "smallint", min: 1, max: 49 },
  { csv: "promotion_second_tirage", db: "promotion_t2", type: "text" },
  { csv: "combinaison_gagnant_second_tirage_en_ordre_croissant", db: "combinaison_t2", type: "text" },

  { csv: "nombre_de_gagnant_au_rang_1_second_tirage", db: "gagnants_rang1_t2", type: "int" },
  { csv: "rapport_du_rang1_second_tirage", db: "rapport_rang1_t2", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang_2_second_tirage", db: "gagnants_rang2_t2", type: "int" },
  { csv: "rapport_du_rang2_second_tirage", db: "rapport_rang2_t2", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang_3_second_tirage", db: "gagnants_rang3_t2", type: "int" },
  { csv: "rapport_du_rang3_second_tirage", db: "rapport_rang3_t2", type: "numeric" },
  { csv: "nombre_de_gagnant_au_rang_4_second_tirage", db: "gagnants_rang4_t2", type: "int" },
  { csv: "rapport_du_rang4_second_tirage", db: "rapport_rang4_t2", type: "numeric" },

  { csv: "numero_7", db: "numero_7", type: "text" }, // TEXT : préserve les zéros non significatifs
  { csv: "devise", db: "devise", type: "text" },
];

// --- Helpers de conversion ---------------------------------------------------

function parseDateFr(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const [jour, mois, annee] = dateStr.trim().split("/");
  if (!jour || !mois || !annee) return null;
  return `${annee}-${mois}-${jour}`;
}

function parseFrenchNumber(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const normalized = raw.trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

// Convertit une valeur brute du CSV selon la définition de colonne.
// Retourne `undefined` si la valeur est invalide (permet de distinguer
// "champ vide autorisé" de "valeur incohérente").
function convertValue(col: ColumnDef, raw: string): string | number | null | undefined {
  const cleaned = col.transform ? col.transform(raw) : raw;

  switch (col.type) {
    case "text":
      return cleaned.trim() === "" ? null : cleaned.trim();

    case "date_fr":
      return parseDateFr(cleaned);

    case "int":
    case "smallint": {
      if (cleaned.trim() === "") return null;
      const n = parseInt(cleaned, 10);
      if (!Number.isInteger(n)) return undefined;
      if (col.min !== undefined && n < col.min) return undefined;
      if (col.max !== undefined && n > col.max) return undefined;
      return n;
    }

    case "numeric":
      return parseFrenchNumber(cleaned);
  }
}

// --- Étape 1 : lecture du CSV -------------------------------------------------

function readCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  return parse(content, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

// --- Étape 2 : transformation + validation ligne par ligne --------------------

function transformRow(raw: Record<string, string>): Record<string, unknown> | null {
  const row: Record<string, unknown> = {};

  for (const col of COLUMNS) {
    const rawValue = raw[col.csv] ?? "";
    const value = convertValue(col, rawValue);

    if (value === undefined) {
      // valeur incohérente -> toute la ligne est rejetée si le champ est requis
      if (col.required) return null;
      row[col.db] = null;
      continue;
    }

    if (value === null && col.required) return null;

    row[col.db] = value;
  }

  return row;
}

// --- Étape 3 : insertion en base ----------------------------------------------

async function insertRows(rows: Record<string, unknown>[]) {
  const dbColumns = COLUMNS.map((c) => c.db);
  const placeholders = dbColumns.map((_, i) => `$${i + 1}`).join(", ");
  const insertSQL = `
    INSERT INTO tirages (${dbColumns.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT (numero_tirage) DO NOTHING
  `;

  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const values = dbColumns.map((db) => row[db]);
      const result = await client.query(insertSQL, values);
      inserted += result.rowCount ?? 0;
    }

    await client.query("COMMIT");
    console.log(`Import terminé : ${inserted} nouvelles lignes insérées.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur pendant l'import, rollback effectué :", err);
    throw err;
  } finally {
    client.release();
  }
}

// --- Point d'entrée -------------------------------------------------------------

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-csv.ts <chemin_vers_csv>");
    process.exit(1);
  }

  const raw = readCsv(path.resolve(filePath));
  console.log(`Lignes lues dans le CSV : ${raw.length}`);

  const rows: Record<string, unknown>[] = [];
  let ignorees = 0;

  for (const r of raw) {
    const transformed = transformRow(r);
    if (transformed) {
      rows.push(transformed);
    } else {
      ignorees++;
    }
  }

  console.log(`Lignes valides : ${rows.length} | Lignes ignorées : ${ignorees}`);

  await insertRows(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
