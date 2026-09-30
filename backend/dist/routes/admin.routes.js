import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { hasRole, canManage } from "../lib/acl.js";
import { hashPassword } from "../lib/auth.js";
export const adminRouter = Router();
async function assertMaster(req, res) {
    if (!(await hasRole(req.userId, "master_admin"))) {
        res.status(403).json({ error: "Only the Master Admin can do this" });
        return false;
    }
    return true;
}
const ROLES = ["master_admin", "content_admin", "business_admin", "jobs_admin", "property_admin", "explore_admin", "moderation_admin", "analytics_admin"];
// Mirrors src/lib/admin.functions.ts createStaff
adminRouter.post("/staff", requireAuth, async (req, res) => {
    if (!(await assertMaster(req, res)))
        return;
    const Input = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().max(100), role: z.enum(ROLES) });
    const parsed = Input.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    const { email, password, name, role } = parsed.data;
    const existing = await db("users").where({ email }).first();
    if (existing)
        return res.status(400).json({ error: "An account with this email already exists" });
    const id = uuid();
    const password_hash = await hashPassword(password);
    await db.transaction(async (trx) => {
        await trx("users").insert({ id, email, password_hash, full_name: name, email_confirmed_at: new Date(), created_at: new Date() });
        await trx("profiles").insert({ id, full_name: name, email, status: "active", created_at: new Date(), updated_at: new Date() });
        await trx("user_roles").insert({ id: uuid(), user_id: id, role: "user", created_at: new Date() });
        await trx("user_roles").insert({ id: uuid(), user_id: id, role, created_at: new Date() });
    });
    res.json({ id });
});
// Mirrors src/lib/admin.functions.ts deleteUser
adminRouter.post("/delete-user", requireAuth, async (req, res) => {
    if (!(await assertMaster(req, res)))
        return;
    const Input = z.object({ userId: z.string().uuid() });
    const parsed = Input.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid input" });
    if (parsed.data.userId === req.userId)
        return res.status(400).json({ error: "You can't delete your own account" });
    await db("users").where({ id: parsed.data.userId }).del(); // ON DELETE CASCADE removes profiles/user_roles
    res.json({ ok: true });
});
// Mirrors src/lib/admin/import.functions.ts fetchGoogleSheet
adminRouter.post("/import/google-sheet", requireAuth, async (req, res) => {
    const Input = z.object({ url: z.string().url().max(500) });
    const parsed = Input.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid input" });
    const canBiz = await canManage(req.userId, "businesses");
    const canJobs = canBiz ? true : await canManage(req.userId, "jobs");
    if (!canJobs)
        return res.status(403).json({ error: "You don't have permission to import listings" });
    const id = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(parsed.data.url)?.[1];
    if (!id)
        return res.status(400).json({ error: "That doesn't look like a Google Sheets link" });
    try {
        const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: "follow" });
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || type.includes("text/html")) {
            return res.status(400).json({ error: 'Couldn\'t open the sheet. In Google Sheets click Share → General access → "Anyone with the link" (Viewer), then try again.' });
        }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 15 * 1024 * 1024)
            return res.status(400).json({ error: "Sheet is too large (over 15 MB)" });
        res.json({ base64: buf.toString("base64") });
    }
    catch {
        res.status(500).json({ error: "Could not fetch the sheet" });
    }
});
//# sourceMappingURL=admin.routes.js.map