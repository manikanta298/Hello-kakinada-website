import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/index.js";
import { createUserWithProfile, signToken, verifyPassword } from "../lib/auth.js";
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
