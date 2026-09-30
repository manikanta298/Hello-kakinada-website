import knexFactory from "knex";
import "dotenv/config";
const JSON_COLS = new Set(["tags", "images", "details", "aliases", "nearby", "failed_rows", "value"]);
export const db = knexFactory({
    client: "mysql2",
    connection: {
        host: process.env["DB_HOST"] ?? "localhost",
        port: Number(process.env["DB_PORT"] ?? 3306),
        user: process.env["DB_USER"] ?? "root",
        password: process.env["DB_PASSWORD"] ?? "",
        database: process.env["DB_NAME"] ?? "hellokakinada",
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