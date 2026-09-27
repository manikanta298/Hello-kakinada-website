// NOTE (MERN migration): originally a TanStack Start server function querying
// Supabase directly. The filtering/counting logic now lives on the backend
// (src/routes/public.routes.ts, matching this file's original `filtered()`
// helper query-for-query) — this file just calls it. Exported names/types and
// call signatures (`getDirectory({ data: {...} })`) are unchanged so route
// files needed no edits.
import { API_BASE } from "./backend-client";

export type Loc = {
  id: string; name: string; slug: string; aliases: string[]; description: string | null; seo_title: string | null;
  seo_description: string | null; image_url: string | null; nearby: string[]; featured: boolean; enabled: boolean; display_order: number;
};

export const KINDS = {
  businesses: { label: "Businesses", table: "businesses" },
  hotels: { label: "Hotels", table: "businesses" },
  food: { label: "Restaurants", table: "food_places" },
  services: { label: "Services", table: "services" },
  jobs: { label: "Jobs", table: "jobs" },
  properties: { label: "Properties", table: "properties" },
  events: { label: "Events", table: "events" },
} as const;
export type Kind = keyof typeof KINDS;
export const KIND_KEYS = Object.keys(KINDS) as Kind[];

export type Item = {
  id: string; slug: string; kind: Kind; title: string; category: string | null; location: string | null; image: string | null;
  address?: string | undefined; phone?: string | undefined; whatsapp?: string | undefined; rating?: string | undefined; featured: boolean; addedAt: string;
};

export const getLocations = async () => {
  const res = await fetch(`${API_BASE}/api/locations`);
  if (!res.ok) return [];
  return (await res.json()) as (Loc & { count: number })[];
};

export const getDirectory = async ({ data }: { data: { slug?: string; kind?: Kind; q?: string; category?: string; page?: number } }) => {
  const params = new URLSearchParams();
  if (data.slug) params.set("slug", data.slug);
  params.set("kind", data.kind ?? "businesses");
  params.set("q", data.q ?? "");
  params.set("category", data.category ?? "");
  params.set("page", String(data.page ?? 1));
  const res = await fetch(`${API_BASE}/api/directory?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as {
    location: Loc | null; items: Item[]; total: number; pages: number; featured: Item[];
    counts: Record<Kind, number>; categories: { name: string; n: number }[]; others: { name: string; slug: string }[];
  } | null;
};
