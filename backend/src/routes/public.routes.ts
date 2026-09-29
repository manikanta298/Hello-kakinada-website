import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { attachAuth, type AuthedRequest } from "../middleware/auth.js";

export const publicRouter = Router();

// ---------------------------------------------------------------------------
// businesses / jobs — mirrors src/lib/listings.functions.ts
// ---------------------------------------------------------------------------
const LISTING_COLS = ["id", "title", "slug", "description", "category", "location", "image_url", "images", "tags", "verified", "details", "created_at", "published_at"];

async function listPublished(table: "businesses" | "jobs") {
  return db(table).select(LISTING_COLS).where({ status: "published" }).orderBy("created_at", "desc").limit(200);
}

publicRouter.get("/businesses", async (_req, res) => {
  const rows = await listPublished("businesses");
  res.json(rows);
});
publicRouter.get("/jobs", async (_req, res) => {
  const rows = await listPublished("jobs");
  res.json(rows);
});

publicRouter.get("/businesses/:slug", async (req, res) => {
  const isId = /^[0-9a-f-]{36}$/i.test(req.params.slug);
  const row = await db("businesses").select(LISTING_COLS).where({ status: "published" }).andWhere(isId ? "id" : "slug", req.params.slug).first();
  res.json(row ?? null);
});
publicRouter.get("/jobs/:slug", async (req, res) => {
  const isId = /^[0-9a-f-]{36}$/i.test(req.params.slug);
  const row = await db("jobs").select(LISTING_COLS).where({ status: "published" }).andWhere(isId ? "id" : "slug", req.params.slug).first();
  res.json(row ?? null);
});

// ---------------------------------------------------------------------------
// locations + directory — mirrors src/lib/locations.functions.ts
// ---------------------------------------------------------------------------
const KINDS: Record<string, { table: string }> = {
  businesses: { table: "businesses" },
  hotels: { table: "businesses" },
  food: { table: "food_places" },
  services: { table: "services" },
  jobs: { table: "jobs" },
  properties: { table: "properties" },
  events: { table: "events" },
};
const KIND_KEYS = Object.keys(KINDS);
const PAGE = 12;
const DIR_COLS = ["id", "title", "slug", "category", "location", "image_url", "images", "featured", "details", "created_at", "published_at"];
const clean = (s: string) => s.replace(/[,()%*\\"']/g, " ").trim();

function filteredQuery(kind: string, aliases: string[], q: string, category: string, featured: boolean, headCountOnly = false) {
  const { table } = KINDS[kind] ?? KINDS["businesses"]!;
  let query = db(table).select(headCountOnly ? ["id"] : DIR_COLS).where({ status: "published" });
  if (kind === "hotels") {
    query = query.andWhere((qb) => qb.whereILike("category", "%hotel%").orWhereILike("category", "%lodge%").orWhereILike("category", "%resort%"));
  }
  const al = aliases.map(clean).filter(Boolean);
  if (al.length) {
    query = query.andWhere((qb) => {
      for (const a of al) {
        qb.orWhereILike("location", `%${a}%`);
        qb.orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.address')) LIKE ?", [`%${a}%`]);
      }
    });
  }
  if (q) query = query.andWhereILike("title", `%${clean(q)}%`);
  if (category) query = query.andWhere({ category });
  if (featured) query = query.andWhere({ featured: true });
  return query;
}

async function countOf(kind: string, aliases: string[]): Promise<number> {
  const row = await filteredQuery(kind, aliases, "", "", false, true).clearSelect().count<{ c: number }[]>({ c: "*" }).first();
  return Number((row as any)?.c ?? 0);
}

publicRouter.get("/locations", async (_req, res) => {
  const locs = await db("locations").select("*").where({ enabled: true }).orderBy("display_order");
  const counts = await Promise.all(
    locs.map(async (l: any) => {
      const aliases: string[] = (l.aliases?.length ? l.aliases : [l.name]) ?? [l.name];
      const perKind = await Promise.all(
        ["businesses", "jobs", "properties"].map(async (k) => {
          return countOf(k, aliases);
        }),
      );
      return perKind.reduce((a, b) => a + b, 0);
    }),
  );
  res.json(locs.map((l: any, i: number) => ({ ...l, count: counts[i] ?? 0 })));
});

const DirectoryInput = z.object({
  slug: z.string().max(80).optional(),
  kind: z.enum(KIND_KEYS as [string, ...string[]]).default("businesses"),
  q: z.string().max(80).default(""),
  category: z.string().max(80).default(""),
  page: z.number().int().min(1).max(500).default(1),
});

publicRouter.get("/directory", async (req, res) => {
  const parsed = DirectoryInput.safeParse({
    slug: req.query["slug"] as string | undefined,
    kind: (req.query["kind"] as string | undefined) ?? "businesses",
    q: (req.query["q"] as string | undefined) ?? "",
    category: (req.query["category"] as string | undefined) ?? "",
    page: req.query["page"] ? Number(req.query["page"]) : 1,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const data = parsed.data;

  let loc: any = null;
  if (data.slug) {
    loc = await db("locations").where({ slug: data.slug, enabled: true }).first();
    if (!loc) return res.json(null);
  }
  const aliases: string[] = loc ? (loc.aliases?.length ? loc.aliases : [loc.name]) : [];
  const from = (data.page - 1) * PAGE;

  const [list, listCountRows, feat, countsArr, catsRows, others] = await Promise.all([
    filteredQuery(data.kind, aliases, data.q, data.category, false).clone().orderBy("created_at", "desc").offset(from).limit(PAGE),
    filteredQuery(data.kind, aliases, data.q, data.category, false).clone().count<{ c: number }[]>({ c: "*" }).first(),
    filteredQuery(data.kind, aliases, "", "", true).clone().orderBy("created_at", "desc").limit(6),
    Promise.all(KIND_KEYS.map(async (k) => [k, await countOf(k, aliases)] as const)),
    filteredQuery(data.kind, aliases, "", "", false).clone().select("category").limit(500),
    db("locations").select("name", "slug").where({ enabled: true }).orderBy("display_order"),
  ]);

  const total = Number((listCountRows as any)?.c ?? 0);
  const catCount: Record<string, number> = {};
  for (const r of catsRows as { category: string | null }[]) if (r.category) catCount[r.category] = (catCount[r.category] ?? 0) + 1;

  res.json({
    location: loc,
    items: list.map((r: any) => toItem(data.kind, r)),
    total,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    featured: feat.map((r: any) => toItem(data.kind, r)),
    counts: Object.fromEntries(countsArr),
    categories: Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, n]) => ({ name, n })),
    others: (others as { name: string; slug: string }[]).filter((o) => o.slug !== loc?.slug),
  });
});

function toItem(kind: string, r: any) {
  const d = r.details ?? {};
  const imgs: string[] = [r.image_url, ...(r.images ?? [])].filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u));
  const str = (v: unknown) => (v == null || v === "" ? undefined : String(v));
  return {
    id: r.id, slug: r.slug || r.id, kind, title: r.title, category: r.category, location: r.location ?? null, image: imgs[0] ?? null,
    address: str(d["address"]), phone: str(d["phone"]), whatsapp: str(d["whatsapp"]), rating: str(d["rating"]),
    featured: !!r.featured, addedAt: r.published_at ?? r.created_at,
  };
}

// ---------------------------------------------------------------------------
// explore feed (videos/photos) — mirrors src/components/explore-feed.tsx
// ---------------------------------------------------------------------------
const EXPLORE_COLS = ["id", "title", "slug", "description", "category", "location", "image_url", "images", "media_url", "tags", "views", "likes", "shares", "published_at", "created_at"];
publicRouter.get("/explore/feed", async (_req, res) => {
  const [videos, photos] = await Promise.all([
    db("videos").select(EXPLORE_COLS).where({ status: "published" }).orderBy("sort_order").orderBy("published_at", "desc").limit(80),
    db("photos").select(EXPLORE_COLS).where({ status: "published" }).orderBy("sort_order").orderBy("published_at", "desc").limit(80),
  ]);
  res.json({ videos, photos });
});

// ---------------------------------------------------------------------------
// record_interaction RPC — mirrors public.record_interaction()
// ---------------------------------------------------------------------------
const ENTITY_TYPES = ["businesses", "jobs", "properties", "events", "food_places", "services", "videos", "photos"];
const KINDS_OK = ["view", "like", "share"];
publicRouter.post("/interactions", attachAuth, async (req: AuthedRequest, res) => {
  const Input = z.object({ entity_type: z.enum(ENTITY_TYPES as [string, ...string[]]), entity_id: z.string(), kind: z.enum(KINDS_OK as [string, ...string[]]) });
  const parsed = Input.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad request" });
  const { entity_type, entity_id, kind } = parsed.data;
  const col = `${kind}s`;
  const affected = await db(entity_type).where({ id: entity_id, status: "published" }).increment(col, 1);
  if (affected) {
    await db("media_interactions").insert({ entity_type, entity_id, kind, user_id: req.userId ?? null, created_at: new Date() });
  }
  res.json({ ok: true });
});
