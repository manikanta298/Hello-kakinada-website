// NOTE (MERN migration): this used to be a TanStack Start server function
// that queried Supabase directly with a service-style key. It's now a plain
// client-side function that calls our Express API (src/routes/public.routes.ts
// on the backend implements the exact same "published only" query). Exported
// names and call signatures (`getBusiness({ data: { slug } })`) are kept
// identical so every call site in the route files needed no changes.
import { API_BASE } from "./backend-client";
import { BUSINESSES, JOBS, type Business, type Job } from "./data";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=70";
type R = { id: string; title: string; slug: string | null; description: string | null; category: string | null; location: string | null; image_url: string | null; images: string[] | null; tags: string[] | null; verified: boolean; details: Record<string, unknown> | null; created_at: string; published_at: string | null };
const s = (v: unknown) => (v == null || v === "" ? undefined : String(v));

function toBusiness(r: R): Business {
  const d = r.details ?? {};
  const images = Array.from(new Set([...(r.image_url ? [r.image_url] : []), ...(r.images ?? [])].filter((u) => /^https?:\/\//i.test(u))));
  return {
    images, slug: r.slug || r.id, name: r.title, category: r.category ?? "Business", location: r.location ?? s(d["city"]) ?? "Kakinada",
    image: images[0] || FALLBACK_IMG, verified: r.verified, open: true, about: r.description ?? "",
    services: r.tags?.length ? r.tags : [], addedAt: r.published_at ?? r.created_at,
    link: s(d["website"]), phone: s(d["phone"]), whatsapp: s(d["whatsapp"]), address: s(d["address"]), hours: s(d["opening_hours"]), mapsUrl: s(d["maps_url"]),
  };
}
function toJob(r: R): Job {
  const d = r.details ?? {};
  const added = r.published_at ?? r.created_at;
  return {
    slug: r.slug || r.id, title: r.title, company: s(d["company"]) ?? "", location: r.location ?? "Kakinada",
    salary: s(d["salary"]) ?? "Salary not specified", experience: s(d["experience"]) ?? "Experience not specified", type: s(d["job_type"]) ?? "Job",
    posted: new Date(added).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), category: r.category ?? "Other",
    addedAt: added, link: s(d["apply_url"]) ?? s(d["company_website"]), phone: s(d["phone"]) ?? s(d["apply_contact"]), whatsapp: s(d["whatsapp"]), email: s(d["email"]),
    description: r.description ?? undefined, responsibilities: s(d["responsibilities"]), requirements: s(d["requirements"]), qualification: s(d["qualification"]), lastDate: s(d["expiry_date"]),
    image: [r.image_url, ...(r.images ?? [])].find((u) => !!u && /^https?:\/\//i.test(u)) ?? undefined, companyImage: s(d["company_logo"]) ?? s(d["logo"]),
    skills: s(d["skills"]), education: s(d["education"]), benefits: s(d["benefits"]),
  };
}

async function list(table: "businesses" | "jobs"): Promise<R[]> {
  try {
    const res = await fetch(`${API_BASE}/api/${table}`);
    if (!res.ok) throw new Error(`public ${table} read failed (${res.status})`);
    return (await res.json()) as R[];
  } catch (err) {
    console.error(`public ${table} read failed`, err instanceof Error ? err.message : err);
    return [];
  }
}

export const getBusinesses = async () => [...(await list("businesses")).map(toBusiness), ...BUSINESSES];
export const getJobs = async () => [...(await list("jobs")).map(toJob), ...JOBS];

async function one(table: "businesses" | "jobs", slug: string): Promise<R | null> {
  const res = await fetch(`${API_BASE}/api/${table}/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  return (await res.json()) as R | null;
}
export const getBusiness = async ({ data }: { data: { slug: string } }) => {
  const r = await one("businesses", data.slug);
  return r ? toBusiness(r) : BUSINESSES.find((b) => b.slug === data.slug) ?? null;
};
export const getJob = async ({ data }: { data: { slug: string } }) => {
  const r = await one("jobs", data.slug);
  return r ? toJob(r) : JOBS.find((j) => j.slug === data.slug) ?? null;
};
