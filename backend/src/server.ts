import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.routes.js";
import { tableRouter } from "./routes/table.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { mediaRouter } from "./routes/media.routes.js";

const app = express();
app.set("trust proxy", 1); // behind Hostinger's reverse proxy (needed for rate limiting)
// CORS_ORIGIN may hold one or more comma-separated origins. Trailing slashes are
// stripped because browsers send the origin without one.
const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "https://lightslategray-hamster-478810.hostingersite.com")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env["PORT"] ?? 4000);
app.listen(port, () => console.log(`HelloKakinada API listening on :${port}`));
