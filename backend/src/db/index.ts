import knexFactory from "knex";
import "dotenv/config";

export const db = knexFactory({
  client: "mysql2",
  connection: {
    host: process.env["DB_HOST"] ?? "localhost",
    port: Number(process.env["DB_PORT"] ?? 3306),
    user: process.env["DB_USER"] ?? "root",
    password: process.env["DB_PASSWORD"] ?? "",
    database: process.env["DB_NAME"] ?? "hellokakinada",
    typeCast: (field: any, next: any) => {
      // MySQL has no native boolean; content tables use TINYINT(1) for
      // featured/verified/enabled/flagged — coerce those back to JS booleans
      // so the API shape matches what the frontend previously got from Postgres.
      if (field.type === "TINY" && field.length === 1) {
        const v = field.string();
        return v === null ? null : v === "1";
      }
      return next();
    },
  },
  pool: { min: 0, max: 10 },
});

export default db;
