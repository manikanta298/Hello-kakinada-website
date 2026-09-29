import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { v4 as uuid } from "uuid";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { isAdmin } from "../lib/acl.js";

export const mediaRouter = Router();

const UPLOAD_DIR = process.env["UPLOAD_DIR"] ?? "./uploads";
const PUBLIC_BASE = process.env["PUBLIC_UPLOAD_BASE_URL"] ?? "http://localhost:4000/media";
if (process.env["NODE_ENV"] === "production" && !process.env["PUBLIC_UPLOAD_BASE_URL"]) {
  throw new Error("PUBLIC_UPLOAD_BASE_URL must be set in production.");
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = String((req.body as { folder?: string })?.folder ?? "misc").replace(/[^a-z0-9-_]/gi, "");
    const dir = path.join(UPLOAD_DIR, "media", folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(".", "") || "bin";
    cb(null, `${uuid()}.${ext}`);
  },
});
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "mp4", "webm", "mov"]);
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    const okMime = /^(image|video)\//.test(file.mimetype) && !file.mimetype.includes("svg");
    cb(null, ALLOWED_EXT.has(ext) && okMime);
  },
});

// Mirrors src/lib/admin/db.ts uploadMedia(). Policy: "staff uploads media" ->
// is_admin(auth.uid()). Storage was a public bucket, so no signed-URL scheme
// is needed here — files are served statically from /media.
mediaRouter.post("/upload", requireAuth, upload.single("file"), async (req: AuthedRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: "Only staff can upload media" });
  if (!req.file) return res.status(400).json({ error: "No file provided or file type not allowed (images/videos only, no SVG)" });
  const folder = String((req.body as { folder?: string })?.folder ?? "misc").replace(/[^a-z0-9-_]/gi, "");
  const url = `${PUBLIC_BASE}/${folder}/${req.file.filename}`;
  res.json({ url });
});
