import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/index.js";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] ?? "7d";

export type JwtClaims = { sub: string; email: string };

export function signToken(claims: JwtClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtClaims;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type PublicUser = { id: string; email: string; full_name: string | null; avatar_url: string | null };

/**
 * Mirrors the Postgres handle_new_user() trigger: creates the profile row,
 * grants the base 'user' role, and — if no master_admin exists yet — also
 * grants 'master_admin' to this account (so the very first signup becomes
 * the site owner, exactly like the original trigger).
 */
export async function createUserWithProfile(email: string, password: string, fullName: string | null): Promise<PublicUser> {
  const id = uuid();
  const password_hash = await hashPassword(password);
  await db.transaction(async (trx) => {
    await trx("users").insert({ id, email, password_hash, full_name: fullName, created_at: new Date() });
    await trx("profiles").insert({ id, full_name: fullName, email, status: "active", created_at: new Date(), updated_at: new Date() });
    await trx("user_roles").insert({ id: uuid(), user_id: id, role: "user", created_at: new Date() });
    const masterExists = await trx("user_roles").where({ role: "master_admin" }).first();
    if (!masterExists) {
      await trx("user_roles").insert({ id: uuid(), user_id: id, role: "master_admin", created_at: new Date() });
    }
  });
  return { id, email, full_name: fullName, avatar_url: null };
}
