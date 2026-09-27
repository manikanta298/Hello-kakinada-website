import { SECTIONS } from "./sections";

export type Kind = "businesses" | "jobs";
export type Target = { key: string; label: string; aliases: string[]; required?: boolean };

const T = (key: string, label: string, aliases: string[] = [], required = false): Target => ({ key, label, aliases: [label, ...aliases], required });

export const TARGETS: Record<Kind, Target[]> = {
  businesses: [
    T("title", "Business Name", ["name", "listing title", "business", "shop name", "company name", "title"], true),
    T("category", "Category", ["business category", "type"]),
    T("subcategory", "Subcategory", ["sub category"]),
    T("description", "Description", ["about", "details", "business description"]),
    T("phone", "Phone", ["mobile", "phone number", "contact", "contact number", "mobile number", "call"]),
    T("whatsapp", "WhatsApp", ["whatsapp number", "whatsapp no", "wa"]),
    T("email", "Email", ["email address", "mail"]),
    T("website", "Website", ["web", "url", "site", "website url"]),
    T("address", "Address", ["business address", "full address", "street"]),
    T("location", "Area", ["locality", "location", "area name"]),
    T("city", "City", ["town"]),
    T("district", "District"),
    T("pincode", "Pincode", ["pin", "pin code", "zip", "postal code"]),
    T("maps_url", "Google Maps URL", ["map", "maps", "google map", "map link", "location url"]),
    T("opening_hours", "Business Hours", ["hours", "timings", "opening hours", "working hours", "timing"]),
    T("services", "Services", ["services offered", "products"]),
    T("image_url", "Featured Image URL", ["image", "featured image", "photo", "image url", "logo"]),
    T("images", "Gallery Image URLs", ["gallery", "gallery images", "gallery image url", "photos", "images", "pictures"]),
    ...[1, 2, 3, 4, 5, 6].map((n) => T(`image_${n}`, `Image URL ${n}`, [`image ${n}`, `image url${n}`, `photo ${n}`, `photo url ${n}`, `gallery image ${n}`, `picture ${n}`, `img ${n}`])),
    T("listing_type", "Listing Type"),
    T("plan", "Premium / Free", ["premium", "plan", "membership"]),
    T("seo_title", "SEO Title", ["meta title"]),
    T("meta_description", "Meta Description", ["seo description"]),
    T("focus_keyword", "Focus Keyword", ["keyword"]),
  ],
  jobs: [
    T("title", "Job Title", ["title", "position", "role", "designation", "job"], true),
    T("company", "Company Name", ["company", "employer", "organisation", "organization"]),
    T("category", "Job Category", ["category", "department", "industry"]),
    T("location", "Location", ["area", "job location", "city"]),
    T("salary", "Salary", ["pay", "ctc", "package", "salary range"]),
    T("experience", "Experience", ["exp", "experience required"]),
    T("qualification", "Qualification", ["education", "qualifications"]),
    T("job_type", "Job Type", ["type", "employment type"]),
    T("gender", "Gender"),
    T("openings", "Vacancies", ["openings", "positions", "no of posts", "vacancy"]),
    T("description", "Job Description", ["description", "details", "about"]),
    T("responsibilities", "Responsibilities", ["duties"]),
    T("requirements", "Requirements"),
    T("skills", "Skills", ["key skills"]),
    T("phone", "Phone", ["mobile", "contact", "contact number", "phone number"]),
    T("whatsapp", "WhatsApp", ["whatsapp number"]),
    T("email", "Email", ["email address", "mail"]),
    T("apply_url", "Apply URL", ["apply link", "application url", "link"]),
    T("company_website", "Company Website", ["website"]),
    T("expiry_date", "Last Date", ["last date to apply", "deadline", "expiry date", "closing date"]),
    T("image_url", "Featured Image", ["image", "image url", "logo"]),
    T("seo_title", "SEO Title", ["meta title"]),
    T("meta_description", "Meta Description", ["seo description"]),
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function autoMap(kind: Kind, headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const t of TARGETS[kind]) {
    const aliases = t.aliases.map(norm);
    const h = headers.find((x) => !used.has(x) && aliases.includes(norm(x)));
    if (h) { map[t.key] = h; used.add(h); }
  }
  return map;
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "listing";
export const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "").slice(-10);
const domain = (s: unknown) => String(s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] ?? "";
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

/** Extract valid, unique http(s) URLs from a cell separated by commas, semicolons, pipes, newlines or spaces. */
export function splitUrls(v: unknown): string[] {
  if (Array.isArray(v)) return Array.from(new Set(v.flatMap(splitUrls)));
  const found = String(v ?? "").match(/https?:\/\/[^\s,;|"'<>]+/gi) ?? [];
  const ok = found.map((u) => u.trim().replace(/[.)\]]+$/, "")).filter((u) => { try { const x = new URL(u); return !!x.hostname.includes("."); } catch { return false; } });
  return Array.from(new Set(ok));
}

function matchOption(value: string, options: string[]) {
  const n = norm(value);
  if (!n) return "";
  return options.find((o) => norm(o) === n) ?? options.find((o) => norm(o).includes(n) || n.includes(norm(o))) ?? value;
}

export type Prepared = {
  index: number;
  raw: Record<string, string>;
  record: Record<string, unknown>; // flat values
  errors: string[];
  duplicateOf?: { id: string; title: string; phone?: string; reason: string };
};

export type Existing = { id: string; title: string; slug: string | null; details: Record<string, unknown> | null; location: string | null };

/** Build a flat record from a sheet row. Never invents data — missing stays empty. */
export function prepareRow(kind: Kind, row: Record<string, unknown>, map: Record<string, string>, index: number): Prepared {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) raw[k] = v == null ? "" : String(v).trim();
  const get = (k: string) => (map[k] ? raw[map[k]!] ?? "" : "");
  const rec: Record<string, unknown> = {};
  for (const t of TARGETS[kind]) { const v = get(t.key); if (v) rec[t.key] = v; }
  const errors: string[] = [];
  if (!rec["title"]) errors.push(`Missing ${TARGETS[kind][0]!.label}`);
  const cats = kind === "businesses" ? SECTIONS["businesses"]!.categories : SECTIONS["jobs"]!.categories;
  if (rec["category"]) rec["category"] = matchOption(String(rec["category"]), cats);
  for (const k of ["phone", "whatsapp"]) {
    if (rec[k] && digits(rec[k]).length < 10) errors.push(`${k === "phone" ? "Phone" : "WhatsApp"} looks invalid`);
  }
  if (rec["email"] && !/^\S+@\S+\.\S+$/.test(String(rec["email"]))) errors.push("Email looks invalid");
  if (kind === "businesses") {
    const featured = splitUrls(rec["image_url"])[0];
    const all = [featured, ...[1, 2, 3, 4, 5, 6].flatMap((n) => splitUrls(rec[`image_${n}`])), ...splitUrls(rec["images"])].filter((u): u is string => !!u);
    for (const n of [1, 2, 3, 4, 5, 6]) delete rec[`image_${n}`];
    const gallery = Array.from(new Set(all)).slice(0, 6);
    delete rec["images"]; delete rec["image_url"];
    if (gallery.length) { rec["images"] = gallery; rec["image_url"] = featured ?? gallery[0]; }
  }
  for (const k of ["website", "company_website", "apply_url", "maps_url", ...(kind === "jobs" ? ["image_url"] : [])]) {
    if (rec[k] && !isUrl(String(rec[k]))) {
      if (k === "website" || k === "company_website") rec[k] = `https://${String(rec[k]).replace(/^\/+/, "")}`;
      else errors.push(`${k.replace("_", " ")} must be a full link (https://…)`);
    }
  }
  if (rec["openings"]) { const n = parseInt(String(rec["openings"]), 10); if (Number.isFinite(n)) rec["openings"] = n; else delete rec["openings"]; }
  if (rec["expiry_date"]) {
    const d = new Date(String(rec["expiry_date"]));
    if (isNaN(d.getTime())) errors.push("Last Date is not a valid date"); else rec["expiry_date"] = d.toISOString().slice(0, 10);
  }
  if (kind === "jobs" && !rec["phone"] && !rec["whatsapp"] && !rec["email"] && !rec["apply_url"]) errors.push("No way to apply (phone, WhatsApp, email or apply link)");
  return { index, raw, record: rec, errors };
}

/** SEO text built only from supplied facts. */
export function seo(kind: Kind, r: Record<string, unknown>) {
  const title = String(r["title"] ?? "");
  const cat = r["category"] ? String(r["category"]) : "";
  const place = r["location"] ? `${r["location"]}, Kakinada` : "Kakinada";
  const hasCity = /kakinada/i.test(title);
  if (kind === "businesses") {
    const name = hasCity ? title : `${title} Kakinada`;
    const services = r["services"] ? String(r["services"]) : "";
    return {
      seo_title: String(r["seo_title"] ?? `${name}${cat ? ` – ${cat}` : ""}`).slice(0, 70),
      focus_keyword: String(r["focus_keyword"] ?? (cat ? `${cat.toLowerCase()} in Kakinada` : `${title} Kakinada`)),
      meta_description: String(r["meta_description"] ?? `Find ${title} in ${place}${services ? ` for ${services}` : cat ? `, ${cat.toLowerCase()}` : ""}. View contact details and enquire directly.`).slice(0, 160),
    };
  }
  const company = r["company"] ? ` at ${r["company"]}` : "";
  return {
    seo_title: String(r["seo_title"] ?? `${title}${company} – Job in ${hasCity ? "" : "Kakinada"}`.replace(/ in $/, "")).slice(0, 70),
    focus_keyword: String(r["focus_keyword"] ?? `${title.toLowerCase()} jobs in Kakinada`),
    meta_description: String(r["meta_description"] ?? `Apply for ${title}${company} in ${place}.${r["salary"] ? ` Salary: ${r["salary"]}.` : ""} View details and apply directly.`).slice(0, 160),
  };
}

export function findDuplicate(rec: Record<string, unknown>, existing: Existing[]) {
  const t = norm(String(rec["title"] ?? ""));
  const ph = digits(rec["phone"]);
  const web = domain(rec["website"]);
  const addr = norm(String(rec["address"] ?? ""));
  const company = norm(String(rec["company"] ?? ""));
  for (const e of existing) {
    const d = e.details ?? {};
    if (ph && ph.length === 10 && (digits(d["phone"]) === ph || digits(d["whatsapp"]) === ph) && (!company || norm(e.title) === t)) return { e, reason: "same phone number" };
    if (web && domain(d["website"]) === web && !/google|facebook|instagram/.test(web)) return { e, reason: "same website" };
    if (t && norm(e.title) === t) {
      if (company) { if (norm(String(d["company"] ?? "")) === company) return { e, reason: "same job title and company" }; continue; }
      if (!addr || !d["address"] || norm(String(d["address"])) === addr) return { e, reason: addr ? "same name and address" : "same name" };
    }
  }
  return null;
}

const CORE = new Set(["title", "description", "category", "subcategory", "location", "image_url", "images"]);

export function toDbRow(kind: Kind, rec: Record<string, unknown>, status: "draft" | "published", slug: string) {
  const row: Record<string, unknown> = { status, slug, published_at: status === "published" ? new Date().toISOString() : null };
  const details: Record<string, unknown> = { ...seo(kind, rec), imported: true };
  for (const [k, v] of Object.entries(rec)) (CORE.has(k) ? row : details)[k] = v;
  if (kind === "businesses" && rec["services"]) row["tags"] = String(rec["services"]).split(/[,;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 15);
  if (kind === "jobs" && rec["skills"]) row["tags"] = String(rec["skills"]).split(/[,;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 15);
  row["details"] = details;
  return row;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.map(esc).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
