import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/index.js";
const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw new Error("JWT_SECRET must be set in the environment (at least 16 characters).");
}
const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] ?? "7d";
export function signToken(claims) {
    return jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
/**
 * Mirrors the Postgres handle_new_user() trigger: creates the profile row,
 * grants the base 'user' role, and — if no master_admin exists yet — also
 * grants 'master_admin' to this account (so the very first signup becomes
 * the site owner, exactly like the original trigger).
 */
export async function createUserWithProfile(email, password, fullName) {
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
/** Finds a user by email, or creates one (used for Google sign-in). */
export async function findOrCreateOAuthUser(email, fullName, avatarUrl) {
    const existing = await db("users").select("id", "email", "full_name", "avatar_url").where({ email }).first();
    if (existing) {
        if (!existing.email_confirmed_at)
            await db("users").where({ id: existing.id }).update({ email_confirmed_at: new Date() });
        return existing;
    }
    // Random unusable password: the account signs in via Google (or "Forgot password" to set one).
    const created = await createUserWithProfile(email, uuid() + uuid(), fullName);
    await db("users").where({ id: created.id }).update({ avatar_url: avatarUrl, email_confirmed_at: new Date() });
    return { ...created, avatar_url: avatarUrl };
}
//# sourceMappingURL=auth.js.map