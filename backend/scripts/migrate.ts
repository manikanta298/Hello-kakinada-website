import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

async function main() {
  const sql = fs.readFileSync(path.resolve("src/db/schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: process.env["DB_HOST"] ?? "localhost",
    port: Number(process.env["DB_PORT"] ?? 3306),
    user: process.env["DB_USER"] ?? "root",
    password: process.env["DB_PASSWORD"] ?? "",
    multipleStatements: true,
  });
  const dbName = process.env["DB_NAME"] ?? "hellokakinada";
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
  await conn.changeUser({ database: dbName });
  console.log(`Applying schema to database \`${dbName}\`...`);
  await conn.query(sql);
  console.log("Done.");
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
