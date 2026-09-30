import { Router } from "express";
import { attachAuth } from "../middleware/auth.js";
import { canManage, canReadAllOfSection, hasRole, isAdmin, CONTENT_TABLE_SECTION } from "../lib/acl.js";
import { runTableQuery } from "../lib/tableQuery.js";
export const tableRouter = Router();
/** Tables never reachable through the generic query endpoint — they have
 *  their own routes with bespoke logic (auth.routes.ts / admin.routes.ts).
 *  `users` holds password hashes and is never exposed this way; user_roles
 *  and profiles ARE reachable below with their own RLS-equivalent policy,
 *  because the original admin screens (admin-users.tsx, users.tsx) query
 *  them directly via `db.from(...)`. */
const FORBIDDEN_TABLES = new Set(["users"]);
const SIMPLE_TABLE_POLICIES = {
    categories: { section: "categories", publicFilter: () => ({ col: "enabled", op: "eq", value: true }) },
    locations: { section: "categories", publicFilter: () => ({ col: "enabled", op: "eq", value: true }) },
    reviews: { section: "reviews", publicFilter: () => ({ col: "status", op: "eq", value: "approved" }) },
    reports: { section: "reports", requireAuthToRead: true },
    notifications: { section: "notifications", publicFilter: () => ({ col: "status", op: "eq", value: "sent" }), requireAuthToRead: true },
    import_logs: { section: "businesses" /* checked per-row kind separately below */, requireAuthToRead: true },
    // media_interactions: SELECT is fully special-cased below (is_admin, not a
    // per-section can_manage check). No section here is fine — INSERT/UPDATE/DELETE
    // are never granted to authenticated users in the original schema (writes only
    // ever happen server-side via record_interaction / POST /api/interactions), so
    // falling through to the default-deny at the bottom of this handler is correct.
    media_interactions: { section: "analytics", requireAuthToRead: true },
};
function isContentTable(table) {
    return table in CONTENT_TABLE_SECTION;
}
tableRouter.post("/:table/query", attachAuth, async (req, res) => {
    const table = req.params.table;
    const spec = req.body;
    if (!table || FORBIDDEN_TABLES.has(table)) {
        return res.status(403).json({ data: null, error: "This table is not accessible via the generic query endpoint", count: null });
    }
    // site_settings: public read, master_admin-only write. Handled first since
    // it isn't a content table and isn't in SIMPLE_TABLE_POLICIES (no section gate on read).
    if (table === "site_settings") {
        if (spec.op !== "select") {
            if (!req.userId || !(await hasRole(req.userId, "master_admin"))) {
                return res.status(403).json({ data: null, error: "Only the Master Admin can change site settings", count: null });
            }
        }
        return res.json(await runTableQuery(table, spec));
    }
    // user_roles: mirrors "own roles or master reads" / "master assigns roles" / "master removes roles".
    // (No UPDATE policy existed in the original schema, so PATCH is refused here too.)
    if (table === "user_roles") {
        if (!req.userId)
            return res.status(401).json({ data: null, error: "Unauthorized", count: null });
        const master = await hasRole(req.userId, "master_admin");
        if (spec.op === "select") {
            const effectiveSpec = master ? spec : { ...spec, filters: [...(spec.filters ?? []), { col: "user_id", op: "eq", value: req.userId }] };
            return res.json(await runTableQuery(table, effectiveSpec));
        }
        if (spec.op === "insert" || spec.op === "delete") {
            if (!master)
                return res.status(403).json({ data: null, error: "Only the Master Admin can manage roles", count: null });
            return res.json(await runTableQuery(table, spec));
        }
        return res.status(403).json({ data: null, error: "Not permitted", count: null });
    }
    // profiles: mirrors "read own or admin" / "update own or master".
    if (table === "profiles") {
        if (!req.userId)
            return res.status(401).json({ data: null, error: "Unauthorized", count: null });
        if (spec.op === "select") {
            const admin = await isAdmin(req.userId);
            const effectiveSpec = admin ? spec : { ...spec, filters: [...(spec.filters ?? []), { col: "id", op: "eq", value: req.userId }] };
            return res.json(await runTableQuery(table, effectiveSpec));
        }
        if (spec.op === "update") {
            const master = await hasRole(req.userId, "master_admin");
            const targetsSelfOnly = (spec.filters ?? []).some((f) => f.col === "id" && f.op === "eq" && f.value === req.userId);
            if (!master && !targetsSelfOnly) {
                return res.status(403).json({ data: null, error: "You can only update your own profile", count: null });
            }
            if (!master) {
                // Non-masters may only change harmless fields (never status/email/id).
                const allowed = new Set(["full_name", "phone", "avatar_url"]);
                const vals = (spec.values ?? {});
                if (Object.keys(vals).some((k) => !allowed.has(k))) {
                    return res.status(403).json({ data: null, error: "You can only edit name, phone and avatar", count: null });
                }
            }
            return res.json(await runTableQuery(table, spec));
        }
        return res.status(403).json({ data: null, error: "Not permitted", count: null });
    }
    if (isContentTable(table)) {
        const section = CONTENT_TABLE_SECTION[table];
        if (spec.op === "select") {
            const staffCanReadAll = req.userId ? await canReadAllOfSection(req.userId, section) : false;
            const effectiveSpec = staffCanReadAll
                ? spec
                : { ...spec, filters: [...(spec.filters ?? []), { col: "status", op: "eq", value: "published" }] };
            return res.json(await runTableQuery(table, effectiveSpec));
        }
        // insert / update / delete all require canManage(section) — "staff inserts/updates/deletes"
        if (!req.userId || !(await canManage(req.userId, section))) {
            return res.status(403).json({ data: null, error: "You don't have permission to manage this content", count: null });
        }
        return res.json(await runTableQuery(table, spec));
    }
    const policy = SIMPLE_TABLE_POLICIES[table];
    if (!policy) {
        return res.status(403).json({ data: null, error: "This table is not accessible via the generic query endpoint", count: null });
    }
    if (policy.requireAuthToRead && !req.userId) {
        return res.status(401).json({ data: null, error: "Unauthorized", count: null });
    }
    if (spec.op === "select") {
        if (table === "reviews") {
            const staffOk = req.userId ? await canManage(req.userId, "reviews") : false;
            let effectiveSpec = spec;
            if (!staffOk) {
                // Mirrors "status = 'approved' OR user_id = auth.uid()" (anon gets just the approved half).
                const orValue = req.userId ? `status.eq.approved,user_id.eq.${req.userId}` : "status.eq.approved";
                effectiveSpec = { ...spec, filters: [...(spec.filters ?? []), { col: "", op: "or", value: orValue }] };
            }
            return res.json(await runTableQuery(table, effectiveSpec));
        }
        if (table === "reports") {
            // requireAuthToRead already guaranteed req.userId above. Mirrors
            // "reporter_id = auth.uid() OR can_manage('reports')" — never unrestricted.
            const staffOk = await canManage(req.userId, "reports");
            const effectiveSpec = staffOk ? spec : { ...spec, filters: [...(spec.filters ?? []), { col: "reporter_id", op: "eq", value: req.userId }] };
            return res.json(await runTableQuery(table, effectiveSpec));
        }
        if (table === "media_interactions") {
            // Mirrors "staff read interactions": public.is_admin(auth.uid()) — any staff
            // role, not scoped to a single manageable section.
            if (!req.userId || !(await isAdmin(req.userId))) {
                return res.status(403).json({ data: null, error: "You don't have permission to view interaction data", count: null });
            }
            return res.json(await runTableQuery(table, spec));
        }
        const staffOk = req.userId ? await canManage(req.userId, policy.section) : false;
        const extra = staffOk ? undefined : policy.publicFilter?.(req.userId);
        const effectiveSpec = extra ? { ...spec, filters: [...(spec.filters ?? []), extra] } : spec;
        return res.json(await runTableQuery(table, effectiveSpec));
    }
    // Writes
    if (table === "reviews") {
        if (spec.op === "insert") {
            if (!req.userId)
                return res.status(401).json({ data: null, error: "Sign in to leave a review", count: null });
            const row = { ...spec.values, user_id: req.userId, status: "pending" };
            return res.json(await runTableQuery(table, { ...spec, values: row }));
        }
        if (!req.userId || !(await canManage(req.userId, "reviews"))) {
            return res.status(403).json({ data: null, error: "You don't have permission to moderate reviews", count: null });
        }
        return res.json(await runTableQuery(table, spec));
    }
    if (table === "reports") {
        if (spec.op === "insert") {
            if (!req.userId)
                return res.status(401).json({ data: null, error: "Sign in to report content", count: null });
            const row = { ...spec.values, reporter_id: req.userId, status: "open" };
            return res.json(await runTableQuery(table, { ...spec, values: row }));
        }
        if (!req.userId || !(await canManage(req.userId, "reports"))) {
            return res.status(403).json({ data: null, error: "You don't have permission to manage reports", count: null });
        }
        return res.json(await runTableQuery(table, spec));
    }
    if (table === "notifications") {
        if (!req.userId || !(await canManage(req.userId, "notifications"))) {
            return res.status(403).json({ data: null, error: "You don't have permission to manage notifications", count: null });
        }
        return res.json(await runTableQuery(table, spec));
    }
    if (table === "import_logs") {
        if (!req.userId)
            return res.status(401).json({ data: null, error: "Unauthorized", count: null });
        const kind = (spec.values?.["kind"] ?? spec.filters?.find((f) => f.col === "kind")?.value);
        const section = kind === "jobs" ? "jobs" : "businesses";
        if (!(await canManage(req.userId, section))) {
            return res.status(403).json({ data: null, error: "You don't have permission to view import logs", count: null });
        }
        if (spec.op === "insert") {
            const row = { ...spec.values, created_by: req.userId };
            return res.json(await runTableQuery(table, { ...spec, values: row }));
        }
        return res.json(await runTableQuery(table, spec));
    }
    if (table === "categories" || table === "locations") {
        if (!req.userId || !(await canManage(req.userId, "categories"))) {
            return res.status(403).json({ data: null, error: "You don't have permission to manage this", count: null });
        }
        return res.json(await runTableQuery(table, spec));
    }
    return res.status(403).json({ data: null, error: "Not permitted", count: null });
});
//# sourceMappingURL=table.routes.js.map