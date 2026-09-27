import { supabase } from "@/integrations/supabase/client";

// Loosely-typed handle for tables addressed dynamically by name.
// (MERN migration: previously typed as SupabaseClient<any>; the backend
// client shim in src/lib/backend-client.ts exposes the same .from()/.rpc()/
// .storage shape, so this still works exactly the same way for callers.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadMedia(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw e2 ?? new Error("Could not create media link");
  return data.signedUrl;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 Days", days: 7 },
  { key: "30d", label: "30 Days", days: 30 },
  { key: "90d", label: "90 Days", days: 90 },
  { key: "1y", label: "1 Year", days: 365 },
] as const;

export function rangeStart(days: number) {
  const d = startOfDay();
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** Bucket timestamps into day (or month for long ranges) series. */
export function bucketSeries(rows: { created_at: string }[], days: number, valueKeys?: { key: string; match: (r: Row) => boolean }[]) {
  const monthly = days > 90;
  const start = rangeStart(days);
  const buckets: Row[] = [];
  const index = new Map<string, Row>();
  const label = (d: Date) => monthly ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const keyOf = (d: Date) => monthly ? `${d.getFullYear()}-${d.getMonth()}` : d.toDateString();
  const cursor = new Date(start);
  while (cursor <= new Date()) {
    const k = keyOf(cursor);
    if (!index.has(k)) {
      const b: Row = { label: label(cursor), count: 0 };
      valueKeys?.forEach((v) => (b[v.key] = 0));
      index.set(k, b);
      buckets.push(b);
    }
    if (monthly) cursor.setMonth(cursor.getMonth() + 1, 1); else cursor.setDate(cursor.getDate() + 1);
  }
  for (const r of rows) {
    const b = index.get(keyOf(new Date(r.created_at)));
    if (!b) continue;
    b.count++;
    valueKeys?.forEach((v) => { if (v.match(r)) b[v.key]++; });
  }
  return buckets;
}

export const fmt = {
  number: (n: unknown) => (typeof n === "number" ? n.toLocaleString("en-IN") : n == null || n === "" ? "—" : String(n)),
  date: (s: unknown) => (s ? new Date(String(s)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"),
  money: (n: unknown) => (n == null || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN")}`),
  ago: (s: string) => {
    const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  },
};
