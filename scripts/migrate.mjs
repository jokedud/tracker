#!/usr/bin/env node
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });
await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await sql.end();
console.log("schema applied");
