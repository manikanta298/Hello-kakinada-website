import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required database environment variable: ${key}`);
  }
}

// Connects straight to an EXISTING database (create it in hPanel first; shared
// hosting blocks CREATE DATABASE). schema.sql is idempotent, so re-running is safe.
async function main() {
  const sql = fs.readFileSync(path.resolve("src/db/schema.sql"), "utf8");
  const dbName = process.env["DB_NAME"];
  const host = process.env["DB_HOST"] === "localhost" ? "127.0.0.1" : process.env["DB_HOST"];
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env["DB_PORT"] ?? 3306),
    user: process.env["DB_USER"],
    password: process.env["DB_PASSWORD"],
    database: dbName,
    multipleStatements: true,
  });
  console.log(`Applying schema to database \`${dbName}\`...`);
  await conn.query(sql);
  console.log("Done.");
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
