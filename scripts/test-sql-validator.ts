// scripts/test-sql-validator.ts
//
// Usage : pnpm exec tsx scripts/test-sql-validator.ts

import { validateSql } from "../lib/sql-validator";

const cas = [
  "SELECT * FROM tirages LIMIT 10",
  "SELECT boule_1, boule_2 FROM tirages WHERE numero_chance = 5",
  "DROP TABLE tirages",
  "SELECT * FROM tirages; DROP TABLE tirages;",
  "DELETE FROM tirages WHERE id = 1",
  "SELECT * FROM utilisateurs",
  "SELECT relname FROM pg_class",
  "SELECT * FROM tirages WHERE numero_tirage = (SELECT current_setting('some.secret'))",
  "SELECT column_name FROM information_schema.columns",
];

for (const sql of cas) {
  const result = validateSql(sql);
  console.log("SQL:", sql);
  console.log("  ->", result);
  console.log();
}
