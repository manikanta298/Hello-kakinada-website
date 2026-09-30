import { Router } from "express";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/index.js";
import { createUserWithProfile, findOrCreateOAuthUser, hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { sendMail } from "../lib/mailer.js";
import { getUserRoles } from "../lib/acl.js";
import { attachAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const SignUpInput = z.object({ email: z.string().email(), password: z.string().min(6), full_name: z.string().max(200).optional() });
const SignInInput = z.object({ email: z.string().email(), password: z.string().min(1) });

async function userPayload(userId: string) {
  const user = await db("users").select("id", "email", "full_name", "avatar_url").where({ id: userId }).first();
  const roles = await getUserRoles(userId);
  const profile = await db("profiles").select("full_name", "status").where({ id: userId }).first();
  return { user, roles, profile };
}

// Mirrors supabase.auth.signUp
authRouter.post("/signup", async (req, res) => {
  const parsed = SignUpInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const { email, password, full_name } = parsed.data;
  const existing = await db("users").where({ email }).first();
  if (existing) return res.status(400).json({ error: "An account with this email already exists" });
  const user = await createUserWithProfile(email, password, full_name ?? null);
  const token = signToken({ sub: user.id, email: user.email });
  const payload = await userPayload(user.id);
  res.json({ token, ...payload });
});

// Mirrors supabase.auth.signInWithPassword
authRouter.post("/signin", async (req, res) => {
  const parsed = SignInInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const { email, password } = parsed.data;
  const user = await db("users").where({ email }).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const token = signToken({ sub: user.id, email: user.email });
  const payload = await userPayload(user.id);
  res.json({ token, ...payload });
});

// Mirrors supabase.auth.getSession / getUser — used by route guards.
authRouter.get("/session", attachAuth, async (req: AuthedRequest, res) => {
  if (!req.userId) return res.json({ user: null, roles: [], profile: null });
  res.json(await userPayload(req.userId));
});

// Stateless JWTs: signout is a client-side token drop. Endpoint kept for
// symmetry with supabase.auth.signOut() so the frontend shim has something to call.
authRouter.post("/signout", (_req, res) => res.json({ ok: true }));

// Mirrors profiles UPDATE policy ("update own or master").
authRouter.patch("/profile", requireAuth, async (req: AuthedRequest, res) => {
  const Input = z.object({ full_name: z.string().max(200).optional(), phone: z.string().max(50).optional(), avatar_url: z.string().url().optional() });
  const parsed = Input.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  await db("profiles").where({ id: req.userId! }).update({ ...parsed.data, updated_at: new Date() });
  res.json({ ok: true });
});

void uuid; // reserved for future profile-scoped inserts

// ---------------------------------------------------------------------------
// Forgot / reset password (SMTP)
// ---------------------------------------------------------------------------
const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const FRONTEND_URL = (process.env["FRONTEND_URL"] ?? process.env["CORS_ORIGIN"] ?? "http://localhost:5173").split(",")[0]!.trim().replace(/\/+$/, "");

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address" });
  const email = parsed.data.email.trim().toLowerCase();
  const user = await db("users").select("id", "email", "full_name").whereRaw("LOWER(email) = ?", [email]).first();
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await db("password_resets").where({ user_id: user.id }).whereNull("used_at").update({ used_at: new Date() });
    await db("password_resets").insert({
      id: uuid(),
      user_id: user.id,
      token_hash: sha256(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date(),
    });
    const link = `${FRONTEND_URL}/reset-password?token=${token}`;
    const ok = await sendMail(
      user.email,
      "Reset your HelloKakinada password",
      `<p>Hi ${user.full_name ?? "there"},</p><p>Click the button below to choose a new password. The link expires in 1 hour.</p><p><a href="${link}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p><p>Or paste this link into your browser:<br>${link}</p><p>If you didn't request this, ignore this email.</p>`,
      `Reset your HelloKakinada password (valid 1 hour): ${link}`,
    );
    if (!ok) console.error("[forgot-password] email could not be sent for user", user.id);
  }
  // Same response whether or not the account exists (prevents account probing).
  res.json({ ok: true, message: "If that email has an account, a reset link has been sent." });
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = z.object({ token: z.string().min(20), password: z.string().min(8, "Password must be at least 8 characters") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const row = await db("password_resets").where({ token_hash: sha256(parsed.data.token) }).whereNull("used_at").where("expires_at", ">", new Date()).first();
  if (!row) return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
  const password_hash = await hashPassword(parsed.data.password);
  await db.transaction(async (trx) => {
    await trx("users").where({ id: row.user_id }).update({ password_hash });
    await trx("password_resets").where({ user_id: row.user_id }).whereNull("used_at").update({ used_at: new Date() });
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Google sign-in (Google Identity Services ID token)
// ---------------------------------------------------------------------------
const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

authRouter.post("/google", async (req, res) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) return res.status(503).json({ error: "Google sign-in is not configured on the server" });
  const parsed = z.object({ credential: z.string().min(20) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Missing Google credential" });
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: parsed.data.credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Google sign-in failed" });
  }
  if (!payload?.email || !payload.email_verified) return res.status(401).json({ error: "Your Google email is not verified" });
  const user = await findOrCreateOAuthUser(payload.email.toLowerCase(), payload.name ?? null, payload.picture ?? null);
  const profile = await db("profiles").select("status").where({ id: user.id }).first();
  if (profile?.status && profile.status !== "active") return res.status(403).json({ error: "This account is suspended" });
  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, ...(await userPayload(user.id)) });
});
