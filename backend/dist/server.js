import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { db } from "./db/index.js";
import { authRouter } from "./routes/auth.routes.js";
import { tableRouter } from "./routes/table.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { mediaRouter } from "./routes/media.routes.js";
const app = express();
app.set("trust proxy", 1); // behind Hostinger's reverse proxy (needed for rate limiting)
// Minimal request log -> shows up in Hostinger's app logs (helps diagnose 404s).
app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`));
    next();
});
// CORS_ORIGIN may hold one or more comma-separated origins. Trailing slashes are
// stripped because browsers send the origin without one.
const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "https://lightslategray-hamster-478810.hostingersite.com")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
// Collapse accidental double slashes ("//api/jobs" -> "/api/jobs") so a trailing
// slash in the frontend's API URL can't cause 404s.
app.use((req, _res, next) => {
    req.url = req.url.replace(/^\/{2,}/, "/");
    next();
});
app.use(express.json({ limit: "20mb" }));
// Serves uploaded media at /media/<folder>/<file>, replacing the Supabase
// Storage "media" public bucket.
app.use("/media", express.static(path.resolve(process.env["UPLOAD_DIR"] ?? "./uploads", "media")));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth/signin", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/table", tableRouter);
app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/api/media", mediaRouter);
app.get("/", (_req, res) => res.json({ name: "HelloKakinada API", ok: true, health: "/api/health" }));
app.get("/api", (_req, res) => res.json({ name: "HelloKakinada API", ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health/db", async (_req, res) => {
    try {
        await db.raw("SELECT 1");
        const [rows] = (await db.raw("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()"));
        res.json({ ok: true, db: true, tables: Number(rows?.[0]?.n ?? 0) });
    }
    catch (err) {
        res.status(500).json({ ok: false, db: false, code: err?.code ?? "UNKNOWN" });
    }
});
// Anything unmatched: a JSON 404 from Express itself. If you see an HTML 404
// instead, the request never reached this app (Hostinger routing / app not running).
app.use((req, res) => res.status(404).json({ error: "Not found", method: req.method, path: req.originalUrl }));
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});
process.on("unhandledRejection", (r) => console.error("unhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));
const port = Number(process.env["PORT"] ?? 4000);
app.listen(port, () => console.log(`HelloKakinada API listening on :${port}`));
//# sourceMappingURL=server.js.map