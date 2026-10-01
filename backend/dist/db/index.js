import knexFactory from "knex";
import "dotenv/config";
const JSON_COLS = new Set(["tags", "images", "details", "aliases", "nearby", "failed_rows", "value"]);
const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required database environment variable: ${key}`);
    }
}
const dbHost = process.env["DB_HOST"] === "localhost" ? "127.0.0.1" : process.env["DB_HOST"];
export const db = knexFactory({
    client: "mysql2",
    connection: {
        host: dbHost,
        port: Number(process.env["DB_PORT"] ?? 3306),
        user: process.env["DB_USER"],
        password: process.env["DB_PASSWORD"],
        database: process.env["DB_NAME"],
        timezone: "Z",
        charset: "utf8mb4",
        typeCast: (field, next) => {
            // MySQL has no native boolean; content tables use TINYINT(1) for
            // featured/verified/enabled/flagged — coerce those back to JS booleans
            // so the API shape matches what the frontend previously got from Postgres.
            // MariaDB (common on Hostinger) stores JSON as LONGTEXT and returns strings;
            // MySQL returns parsed values. Normalise both to real JS values.
            if (JSON_COLS.has(field.name) && field.type !== "TINY") {
                const s = field.string();
                if (s === null)
                    return null;
                try {
                    return JSON.parse(s);
                }
                catch {
                    return s;
                }
            }
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
//# sourceMappingURL=index.js.map