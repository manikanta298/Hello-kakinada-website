import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Menu, X, Plus, Home, Compass, Heart, User, MapPin, Phone, Navigation, BadgeCheck, Briefcase, Clock, Flag, CalendarPlus, ExternalLink } from "lucide-react";
import { SUGGESTIONS, LOCATIONS, type Business, type Job, type Property, type Restaurant, type Event } from "@/lib/data";
import logoAsset from "@/assets/hellokakinada-logo-transparent.png.asset.json";

const NAV = [
  { to: "/", label: "Home" }, { to: "/jobs", label: "Jobs" }, { to: "/properties", label: "Rent / Buy" },
  { to: "/businesses", label: "Businesses" }, { to: "/restaurants", label: "Food" }, { to: "/services", label: "Services" },
  { to: "/locations", label: "Locations" }, { to: "/explore", label: "Explore" }, { to: "/events", label: "More" },
] as const;

export function Logo() {
  return (
    <Link to="/" aria-label="HelloKakinada.in home" className="flex shrink-0 items-center">
      <img src={logoAsset.url} alt="HelloKakinada.in" className="h-8 w-auto max-w-[150px] object-contain sm:h-9 sm:max-w-[190px]" />
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-6 hidden gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.label} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ${isActive ? "text-foreground" : ""}`} end>{n.label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to={`/search?q=${encodeURIComponent(String(""))}`} aria-label="Search" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-secondary"><Search className="h-5 w-5" /></Link>
          <Link to="/dashboard" className="hidden items-center gap-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground sm:flex"><Plus className="h-4 w-4" />List / Post</Link>
          <AccountButton />
          <button aria-label="Menu" onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-secondary lg:hidden">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && (
        <nav className="grid gap-1 border-t p-4 lg:hidden">
          {NAV.map((n) => <Link key={n.label} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-secondary">{n.label}</Link>)}
          <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-semibold text-primary">+ List / Post</Link>
        </nav>
      )}
    </header>
  );
}

export function BottomNav() {
  const items = [
    { to: "/", label: "Home", Icon: Home }, { to: "/search", label: "Search", Icon: Search },
    { to: "/explore", label: "Explore", Icon: Compass }, { to: "/account", label: "Saved", Icon: Heart }, { to: "/account", label: "Account", Icon: User },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background md:hidden">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={label} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground ${isActive ? "text-primary" : ""}`} end><Icon className="h-5 w-5" />{label}</NavLink>
      ))}
    </nav>
  );
}

export function SearchBar({ big = false, initial = "" }: { big?: boolean; initial?: string }) {
  const nav = useNavigate();
  const [q, setQ] = useState(initial);
  const [loc, setLoc] = useState("");
  const [focus, setFocus] = useState(false);
  const sugg = SUGGESTIONS.filter((s) => s.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const go = (v: string) => nav(`/search?q=${encodeURIComponent([v, loc && `in ${loc}`].filter(Boolean).join(" "))}`);
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="relative">
      <div className={`flex flex-col gap-2 rounded-2xl bg-card p-2 shadow-[var(--shadow-lg)] sm:flex-row ${big ? "sm:p-2.5" : ""}`}>
        <label className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder="What are you looking for in Kakinada?" className={`w-full bg-transparent py-3 text-foreground outline-none ${big ? "text-base sm:text-lg" : ""}`} />
        </label>
        <label className="flex items-center gap-2 border-t px-3 sm:border-l sm:border-t-0">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="bg-transparent py-3 text-sm text-foreground outline-none">
            <option value="">All Kakinada</option>
            {LOCATIONS.map((l) => <option key={l.slug}>{l.name}</option>)}
          </select>
        </label>
        <button className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Search</button>
      </div>
      {focus && sugg.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-[var(--shadow-lg)]">
          {sugg.map((s) => <li key={s}><button type="button" onMouseDown={() => go(s)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-secondary"><Search className="h-4 w-4 text-muted-foreground" />{s}</button></li>)}
        </ul>
      )}
    </form>
  );
}

export function Demo() {
  return <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-foreground">Demo</span>;
}

export function SectionHead({ title, sub, cta, to }: { title: string; sub?: string; cta?: string; to?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0"><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>{sub && <p className="mt-1 text-muted-foreground">{sub}</p>}</div>
      {cta && to && <Link to={to} className="shrink-0 text-sm font-semibold text-primary hover:underline">{cta} →</Link>}
    </div>
  );
}

const card = "group overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]";
const btn = "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold";
const maps = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q + " Kakinada")}`;
export const addedDate = (s?: string) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Date added + link, shown on real (database) listings. */
export function ListingMeta({ addedAt, link, linkLabel = "Website" }: { addedAt?: string | undefined; link?: string | undefined; linkLabel?: string }) {
  if (!addedAt && !link) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {addedAt && <span className="inline-flex items-center gap-1"><CalendarPlus className="h-3 w-3" />Added {addedDate(addedAt)}</span>}
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-semibold text-primary hover:underline"><ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{linkLabel}</span></a>}
    </div>
  );
}

export function BusinessCard({ b }: { b: Business }) {
  return (
    <div className={card}>
      <Link to={`/business/${b.slug}`}><img src={b.image} alt={b.name} loading="lazy" className="aspect-[4/3] w-full object-cover" /></Link>
      <div className="p-4">
        <div className="flex items-center gap-2">{!b.addedAt && <Demo />}{b.verified && b.addedAt && <Verified />}<span className="text-xs text-muted-foreground">No ratings yet</span></div>
        <Link to={`/business/${b.slug}`} className="mt-2 block font-bold">{b.name}</Link>
        <p className="text-sm text-muted-foreground">{b.category} · <MapPin className="inline h-3 w-3" /> {b.location}</p>
        <ListingMeta addedAt={b.addedAt} link={b.link} />
        <div className="mt-4 flex gap-2">
          {b.phone ? <a href={`tel:${b.phone}`} className={`${btn} bg-secondary`}><Phone className="h-4 w-4" />Call</a> : <button disabled className={`${btn} bg-secondary text-muted-foreground`}><Phone className="h-4 w-4" />Call</button>}
          <a href={maps(b.location)} target="_blank" rel="noreferrer" className={`${btn} bg-primary text-primary-foreground`}><Navigation className="h-4 w-4" />Directions</a>
        </div>
      </div>
    </div>
  );
}

export function JobCard({ j }: { j: Job }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Briefcase className="h-5 w-5" /></span>
        <div className="min-w-0"><Link to={`/job/${j.slug}`} className="font-bold">{j.title}</Link><p className="text-sm text-muted-foreground">{[j.company, j.location].filter(Boolean).join(" · ")}</p></div>
        {!j.addedAt && <span className="ml-auto"><Demo /></span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[j.salary, j.experience, j.type].map((t, i) => <span key={i} className="rounded-full bg-secondary px-2.5 py-1 font-medium">{t}</span>)}
      </div>
      {j.link && <ListingMeta link={j.link} linkLabel="Apply link" />}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3" /> {j.addedAt ? `Added ${addedDate(j.addedAt)}` : j.posted}</span>
        <Link to={`/job/${j.slug}`} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Apply</Link>
      </div>
    </div>
  );
}

export function PropertyCard({ p }: { p: Property }) {
  return (
    <div className={card}>
      <div className="relative"><img src={p.image} alt={`${p.bhk} in ${p.location}`} loading="lazy" className="aspect-[4/3] w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-background px-2.5 py-1 text-xs font-bold">For {p.mode}</span></div>
      <div className="p-4">
        <div className="flex items-center justify-between"><p className="text-xl font-extrabold">{p.price}</p><Demo /></div>
        <p className="mt-1 text-sm font-medium">{p.bhk} {p.type} · {p.area}</p>
        <p className="text-sm text-muted-foreground"><MapPin className="inline h-3 w-3" /> {p.location}</p>
        <Link to={`/property/${p.slug}`} className={`${btn} mt-4 w-full bg-primary text-primary-foreground`}>Contact</Link>
      </div>
    </div>
  );
}

export function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <div className={card}>
      <img src={r.image} alt={r.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center justify-between"><Demo /><span className={`text-xs font-bold ${r.open ? "text-success" : "text-destructive"}`}>{r.open ? "Open" : "Closed"}</span></div>
        <p className="mt-2 font-bold">{r.name}</p>
        <p className="text-sm text-muted-foreground">{r.cuisine} · {r.price} · {r.location}</p>
        <a href={maps(r.location)} target="_blank" rel="noreferrer" className={`${btn} mt-4 w-full bg-secondary`}><Navigation className="h-4 w-4" />Directions</a>
      </div>
    </div>
  );
}

export function EventCard({ e }: { e: Event }) {
  return (
    <div className={card}>
      <img src={e.image} alt={e.name} loading="lazy" className="aspect-[16/9] w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center gap-2"><span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">{e.category}</span><Demo /></div>
        <Link to={`/event/${e.slug}`} className="mt-2 block font-bold">{e.name}</Link>
        <p className="text-sm text-muted-foreground">{e.date} · {e.time}</p>
        <p className="text-sm text-muted-foreground">{e.venue}, {e.location}</p>
        <Link to={`/event/${e.slug}`} className={`${btn} mt-4 w-full bg-primary text-primary-foreground`}>Register</Link>
      </div>
    </div>
  );
}

export function Verified() {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><BadgeCheck className="h-4 w-4" />Not yet verified</span>;
}

export function ReportLink() {
  return <button onClick={() => alert("Thanks — reporting will be available once accounts launch.")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Flag className="h-3 w-3" />Report listing</button>;
}

export function Page({ title, sub, children }: { title: string; sub?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Chips({ items, value, onChange }: { items: string[]; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {items.map((c) => <button key={c} onClick={() => onChange?.(value === c ? "" : c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${value === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>{c}</button>)}
    </div>
  );
}

export function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Explore", [["Jobs", "/jobs"], ["Businesses", "/businesses"], ["Rent / Buy", "/properties"], ["Restaurants", "/restaurants"], ["Services", "/services"], ["Events", "/events"], ["Places", "/explore"]]],
    ["Kakinada", [["Locations", "/locations"], ["Emergency", "/#emergency"], ["Government Information", "https://kakinada.ap.gov.in"], ["Local News", "/#news"]]],
    ["Business", [["List Your Business", "/dashboard"], ["Post a Job", "/dashboard"], ["Advertise", "/dashboard"], ["Business Dashboard", "/dashboard"]]],
    ["Company", [["About Us", "/about"], ["Contact", "/about"], ["Privacy Policy", "/about"], ["Terms", "/about"], ["Disclaimer", "/about"], ["Community Guidelines", "/about"]]],
  ];
  return (
    <footer className="mt-16 bg-foreground pb-24 text-background md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div><p className="text-lg font-extrabold">HelloKakinada.in</p><p className="mt-2 text-sm opacity-70">Your City. Your People. Your Hello Kakinada.</p><p className="mt-4 text-xs opacity-50">An independent private platform. Not affiliated with any government body.</p></div>
        {cols.map(([h, links]) => (
          <div key={h}><p className="font-bold">{h}</p><ul className="mt-3 space-y-2 text-sm opacity-70">{links.map(([l, href]) => <li key={l}><a href={href} className="hover:opacity-100">{l}</a></li>)}</ul></div>
        ))}
      </div>
      <div className="border-t border-background/10 py-5 text-center text-xs opacity-60">© 2026 HelloKakinada.in. All rights reserved. · Instagram · Facebook · YouTube · X</div>
    </footer>
  );
}

function AccountButton() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!email) return <Link to="/auth" className="hidden rounded-xl border px-4 py-2 text-sm font-semibold sm:block">Login</Link>;
  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Link to="/admin" title={email} className="rounded-xl border px-4 py-2 text-sm font-semibold">My panel</Link>
      <button onClick={() => supabase.auth.signOut()} className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">Sign out</button>
    </div>
  );
}
