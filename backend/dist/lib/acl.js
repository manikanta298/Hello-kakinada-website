import { db } from "../db/index.js";
/** Mirrors public.app_role enum. */
export const APP_ROLES = [
    "master_admin", "content_admin", "business_admin", "jobs_admin", "property_admin",
    "explore_admin", "moderation_admin", "analytics_admin", "user",
];
/** Table name -> permission "section", mirrors the (t, s) pairs used to build
 *  each content table's RLS policies in the Postgres migration. */
export const CONTENT_TABLE_SECTION = {
    businesses: "businesses",
    jobs: "jobs",
    properties: "properties",
    events: "events",
    food_places: "food",
    services: "services",
    videos: "videos",
    photos: "photos",
};
export async function getUserRoles(userId) {
    const rows = await db("user_roles").select("role").where({ user_id: userId });
    return rows.map((r) => r.role);
}
/** Mirrors public.has_role(_user_id, _role). */
export async function hasRole(userId, role) {
    const row = await db("user_roles").where({ user_id: userId, role }).first();
    return !!row;
}
/** Mirrors public.is_admin(_user_id): any role other than 'user'. */
export async function isAdmin(userId) {
    const row = await db("user_roles").where({ user_id: userId }).whereNot({ role: "user" }).first();
    return !!row;
}
/** Mirrors public.can_manage(_user_id, _section). */
export async function canManage(userId, section) {
    const roles = await getUserRoles(userId);
    if (roles.includes("master_admin"))
        return true;
    const CONTENT_ADMIN_SECTIONS = [
        "videos", "photos", "categories", "jobs", "properties", "businesses", "food",
        "services", "events", "notifications",
    ];
    if (roles.includes("content_admin") && CONTENT_ADMIN_SECTIONS.includes(section))
        return true;
    if (roles.includes("explore_admin") && ["videos", "photos", "categories"].includes(section))
        return true;
    if (roles.includes("business_admin") && ["businesses", "food", "services"].includes(section))
        return true;
    if (roles.includes("jobs_admin") && section === "jobs")
        return true;
    if (roles.includes("property_admin") && section === "properties")
        return true;
    if (roles.includes("moderation_admin") && ["reviews", "reports"].includes(section))
        return true;
    if (roles.includes("analytics_admin") && section === "analytics")
        return true;
    return false;
}
/** Mirrors the "staff reads all" policy: canManage(section) OR analytics_admin. */
export async function canReadAllOfSection(userId, section) {
    if (await canManage(userId, section))
        return true;
    return hasRole(userId, "analytics_admin");
}
/** Profile status check used by profiles suspension (roles = [] if suspended),
 *  mirrored from src/routes/_authenticated/admin/route.tsx's beforeLoad. */
export async function isSuspended(userId) {
    const row = await db("profiles").select("status").where({ id: userId }).first();
    return row?.status === "suspended";
}
//# sourceMappingURL=acl.js.map