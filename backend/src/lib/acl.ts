import { db } from "../db/index.js";

/** Mirrors public.app_role enum. */
export const APP_ROLES = [
  "master_admin", "content_admin", "business_admin", "jobs_admin", "property_admin",
  "explore_admin", "moderation_admin", "analytics_admin", "user",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Mirrors the CONTENT_ADMIN-manageable sections + moderation/analytics sections
 *  from can_manage() in the Postgres migration. */
export type Section =
  | "videos" | "photos" | "categories" | "jobs" | "properties" | "businesses" | "food"
  | "services" | "events" | "notifications" | "reviews" | "reports" | "analytics";

/** Table name -> permission "section", mirrors the (t, s) pairs used to build
 *  each content table's RLS policies in the Postgres migration. */
export const CONTENT_TABLE_SECTION: Record<string, Section> = {
  businesses: "businesses",
  jobs: "jobs",
  properties: "properties",
  events: "events",
  food_places: "food",
  services: "services",
  videos: "videos",
  photos: "photos",
};

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const rows = await db("user_roles").select("role").where({ user_id: userId });
  return rows.map((r) => r.role as AppRole);
}

/** Mirrors public.has_role(_user_id, _role). */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const row = await db("user_roles").where({ user_id: userId, role }).first();
  return !!row;
}

/** Mirrors public.is_admin(_user_id): any role other than 'user'. */
export async function isAdmin(userId: string): Promise<boolean> {
  const row = await db("user_roles").where({ user_id: userId }).whereNot({ role: "user" }).first();
  return !!row;
}

/** Mirrors public.can_manage(_user_id, _section). */
export async function canManage(userId: string, section: Section): Promise<boolean> {
  const roles = await getUserRoles(userId);
  if (roles.includes("master_admin")) return true;
  const CONTENT_ADMIN_SECTIONS: Section[] = [
    "videos", "photos", "categories", "jobs", "properties", "businesses", "food",
    "services", "events", "notifications",
  ];
  if (roles.includes("content_admin") && CONTENT_ADMIN_SECTIONS.includes(section)) return true;
  if (roles.includes("explore_admin") && (["videos", "photos", "categories"] as Section[]).includes(section)) return true;
  if (roles.includes("business_admin") && (["businesses", "food", "services"] as Section[]).includes(section)) return true;
  if (roles.includes("jobs_admin") && section === "jobs") return true;
  if (roles.includes("property_admin") && section === "properties") return true;
  if (roles.includes("moderation_admin") && (["reviews", "reports"] as Section[]).includes(section)) return true;
  if (roles.includes("analytics_admin") && section === "analytics") return true;
  return false;
}

/** Mirrors the "staff reads all" policy: canManage(section) OR analytics_admin. */
export async function canReadAllOfSection(userId: string, section: Section): Promise<boolean> {
  if (await canManage(userId, section)) return true;
  return hasRole(userId, "analytics_admin");
}

/** Profile status check used by profiles suspension (roles = [] if suspended),
 *  mirrored from src/routes/_authenticated/admin/route.tsx's beforeLoad. */
export async function isSuspended(userId: string): Promise<boolean> {
  const row = await db("profiles").select("status").where({ id: userId }).first();
  return row?.status === "suspended";
}
