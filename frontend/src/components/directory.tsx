import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Phone, MessageCircle, Search, Star, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { KINDS, KIND_KEYS, type Item, type Kind } from "@/lib/locations.functions";
import { addedDate } from "@/components/site";

export type DirSearch = { kind: Kind; q: string; category: string; page: number };
/** URL search params — all optional so plain links need no search object. */
export const parseDirSearch = (s: Record<string, unknown>): Partial<DirSearch> => {
  const n = normDir(s);
  const out: Partial<DirSearch> = {};
  if (typeof s["kind"] === "string" && (KIND_KEYS as string[]).includes(s["kind"])) out.kind = n.kind;
  if (n.q) out.q = n.q;
  if (n.category) out.category = n.category;
  if (n.page > 1) out.page = n.page;
  return out;
};
export const normDir = (s: Record<string, unknown>, def: Kind = "businesses"): DirSearch => ({
  kind: typeof s["kind"] === "string" && (KIND_KEYS as string[]).includes(s["kind"]) ? (s["kind"] as Kind) : def,
  q: typeof s["q"] === "string" ? s["q"].slice(0, 80) : "",
  category: typeof s["category"] === "string" ? s["category"].slice(0, 80) : "",
  page: Math.min(500, Math.max(1, Number(s["page"]) || 1)),
});

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const wa = (p: string) => { const d = p.replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "91" + d : d}`; };

export function ItemCard({ it }: { it: Item }) {
  const detail = it.kind === "businesses" || it.kind === "hotels" ? { to: `/business/${it.slug}` } : it.kind === "jobs" ? { to: `/job/${it.slug}` } : null;
  const title = detail ? <Link to={detail.to} className="font-bold hover:text-primary">{it.title}</Link> : <span className="font-bold">{it.title}</span>;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      {it.image ? <img src={it.image} alt={it.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] w-full place-items-center bg-muted text-muted-foreground"><ImageOff className="h-6 w-6" /></div>}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs">
          {it.category && <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">{it.category}</span>}
          {it.featured && <span className="font-semibold text-accent">★ Featured</span>}
          {it.rating && <span className="ml-auto flex items-center gap-0.5 font-semibold"><Star className="h-3 w-3 fill-current text-accent" />{it.rating}</span>}
        </div>
        <h3 className="mt-2">{title}</h3>
        {(it.address || it.location) && <p className="mt-1 flex gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{it.address || it.location}</span></p>}
        <p className="mt-1 text-xs text-muted-foreground">Added {addedDate(it.addedAt)}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {it.phone && <a href={tel(it.phone)} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><Phone className="h-4 w-4" />Call</a>}
          {it.whatsapp && <a href={wa(it.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          {detail && <Link to={detail.to} className="ml-auto rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">View details</Link>}
        </div>
      </div>
    </article>
  );
}

type Data = { items: Item[]; total: number; pages: number; featured: Item[]; counts: Record<Kind, number>; categories: { name: string; n: number }[] };

export function Directory({ data, search, onChange, kinds = KIND_KEYS, placeName }: { data: Data; search: DirSearch; onChange: (p: Partial<DirSearch>) => void; kinds?: readonly Kind[]; placeName: string }) {
  const [q, setQ] = useState(search.q);
  useEffect(() => setQ(search.q), [search.q]);
  const label = KINDS[search.kind].label;
  return (
    <div>
      {kinds.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {kinds.map((k) => (
            <button key={k} onClick={() => onChange({ kind: k, category: "", q: "", page: 1 })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${search.kind === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>
              {KINDS[k].label} <span className="opacity-70">{data.counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); onChange({ q, page: 1 }); }} className="mt-3 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl border bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()} in ${placeName}`} className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
        <button className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Search</button>
      </form>
      {data.categories.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onChange({ category: "", page: 1 })} className={`rounded-full px-3 py-1 text-xs font-semibold ${!search.category ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>All categories</button>
          {data.categories.map((c) => <button key={c.name} onClick={() => onChange({ category: c.name, page: 1 })} className={`rounded-full px-3 py-1 text-xs font-semibold ${search.category === c.name ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{c.name} ({c.n})</button>)}
        </div>
      )}

      {data.featured.length > 0 && !search.q && !search.category && search.page === 1 && (
        <section className="mt-8"><h2 className="mb-4 text-xl font-bold">Featured {label.toLowerCase()} in {placeName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.featured.map((it) => <ItemCard key={it.id} it={it} />)}</div></section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">Latest {label.toLowerCase()} in {placeName} <span className="text-base font-normal text-muted-foreground">({data.total})</span></h2>
        {data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="font-semibold">No {label.toLowerCase()} listed in {placeName}{search.q || search.category ? " match your search" : " yet"}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another category, or <Link to="/dashboard" className="font-semibold text-primary">add your listing</Link>.</p>
          </div>
        ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((it) => <ItemCard key={it.id} it={it} />)}</div>}
        {data.pages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
            <button disabled={search.page <= 1} onClick={() => onChange({ page: search.page - 1 })} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            Page {search.page} of {data.pages}
            <button disabled={search.page >= data.pages} onClick={() => onChange({ page: search.page + 1 })} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        )}
      </section>
    </div>
  );
}
