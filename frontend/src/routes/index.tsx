import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Briefcase, Building2, Store, UtensilsCrossed, Wrench, CalendarDays, Zap, Droplet, Wind, Car, Bike, Sparkles, Printer, Camera, Cctv, Sofa, Megaphone, PartyPopper, Hospital, GraduationCap, Phone, Check, Smartphone, MapPin } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { SearchBar, SectionHead, BusinessCard, JobCard, PropertyCard, RestaurantCard, EventCard, Grid, Chips, Demo } from "@/components/site";
import { getBusinesses, getJobs } from "@/lib/listings.functions";
import { getLocations } from "@/lib/locations.functions";
import { PopularLocations } from "@/components/popular-locations";
import { PROPERTIES, RESTAURANTS, EVENTS, PLACES, SERVICES, LOCATIONS, NEWS, EMERGENCY } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/";
const routeMeta = {
  head: () => seo("HelloKakinada.in — Everything Kakinada. In One Place.", "Discover businesses, jobs, properties, restaurants, services, places and events in Kakinada, Andhra Pradesh.", "/"),
  loader: async () => { const [businesses, jobs, locations] = await Promise.all([getBusinesses(), getJobs(), getLocations()]); return { businesses: businesses.slice(0, 8), jobs: jobs.slice(0, 8), locations }; },
  component: Index,
};
export default routeMeta;


const CATS = [
  { to: "/jobs", label: "Jobs", d: "Find jobs and opportunities in Kakinada.", Icon: Briefcase, c: "bg-primary/10 text-primary" },
  { to: "/properties", label: "Rent / Buy", d: "Find properties for rent and sale.", Icon: Building2, c: "bg-success/10 text-success" },
  { to: "/businesses", label: "Businesses", d: "Discover local businesses.", Icon: Store, c: "bg-accent/10 text-accent" },
  { to: "/restaurants", label: "Food", d: "Find restaurants, cafes and food places.", Icon: UtensilsCrossed, c: "bg-destructive/10 text-destructive" },
  { to: "/services", label: "Services", d: "Find trusted local service providers.", Icon: Wrench, c: "bg-warning/20 text-warning-foreground" },
  { to: "/events", label: "Events", d: "Discover what's happening in Kakinada.", Icon: CalendarDays, c: "bg-primary/10 text-primary" },
] as const;
const SICONS = [Zap, Droplet, Wind, Car, Bike, Sparkles, Printer, Camera, Cctv, Sofa, Megaphone, PartyPopper];
const S = "mx-auto max-w-7xl px-4 py-12 sm:py-16";

function Index() {
  const { businesses: BUSINESSES, jobs: JOBS, locations: LOCS } = useLoaderData() as any;
  const [mode, setMode] = useState<"Buy" | "Rent">("Rent");
  return (
    <>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Kakinada coastline at sunset" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/50 to-background" />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/80">Your City. Your People. Your Hello Kakinada.</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-6xl">Everything Kakinada.<br />In One Place.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/90 sm:text-lg">Discover businesses, jobs, properties, restaurants, services, places and events around Kakinada.</p>
          <div className="mt-8 text-left"><SearchBar big /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <span className="font-medium text-foreground/70">Popular:</span>
            {["Jobs", "Restaurants", "Hospitals", "Properties", "Businesses", "Services"].map((p) => <Link key={p} to={`/search?q=${encodeURIComponent(String(p))}`} className="rounded-full bg-card/90 px-3 py-1 font-medium shadow-sm hover:text-primary">{p}</Link>)}
          </div>
        </div>
      </section>

      <section className={S}>
        <SectionHead title="Explore Kakinada" sub="Everything local, organised." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {CATS.map(({ to, label, d, Icon, c }) => (
            <Link key={label} to={to} className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${c} transition group-hover:scale-110`}><Icon className="h-6 w-6" /></span>
              <p className="mt-4 font-bold">{label}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </Link>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground">Listings marked <Demo /> are sample content shown until real listings are added.</p>

      <section className={S}><SectionHead title="Discover Local Businesses" sub="Find businesses near you." cta="View All Businesses" to="/businesses" /><Grid>{BUSINESSES.map((b) => <BusinessCard key={b.slug} b={b} />)}</Grid></section>

      <section className="bg-secondary/60"><div className={S}>
        <SectionHead title="Latest Jobs in Kakinada" cta="View All Jobs" to="/jobs" />
        <Grid>{JOBS.map((j) => <JobCard key={j.slug} j={j} />)}</Grid>
        <Link to="/dashboard" className="mt-6 inline-block rounded-xl border bg-card px-5 py-3 font-semibold">Post a Job</Link>
      </div></section>

      <section className={S}>
        <SectionHead title="Find Your Next Property" cta="Explore Properties" to="/properties" />
        <div className="mb-6 inline-flex rounded-xl bg-secondary p-1">{(["Buy", "Rent"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-5 py-2 text-sm font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{m}</button>)}</div>
        <Grid>{PROPERTIES.filter((p) => p.mode === mode).map((p) => <PropertyCard key={p.slug} p={p} />)}</Grid>
      </section>

      <section className={S}>
        <SectionHead title="What's Good to Eat?" cta="Explore Food" to="/restaurants" />
        <Chips items={["Biryani", "Tiffins", "Restaurants", "Cafes", "Bakeries", "Fast Food", "Sweets"]} />
        <Grid>{RESTAURANTS.map((r) => <RestaurantCard key={r.slug} r={r} />)}</Grid>
      </section>

      <section className={S}>
        <SectionHead title="Local Services You Can Find" cta="All Services" to="/services" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SERVICES.map((s, i) => { const I = SICONS[i] ?? Zap; return (
            <Link key={s} to="/services" className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center text-sm font-medium transition hover:border-primary"><I className="h-6 w-6 text-primary" />{s}</Link>
          ); })}
        </div>
      </section>

      <section className={S}>
        <SectionHead title="Explore Kakinada" sub="Beaches, temples, food and weekend escapes." cta="Explore Kakinada" to="/explore" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {PLACES.map((p, i) => (
            <Link key={p.name} to="/explore" className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 lg:col-span-1" : ""}`}>
              <img src={p.image} alt={p.name} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
              <p className="absolute bottom-4 left-4 text-lg font-bold text-primary-foreground">{p.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={S}>
        <SectionHead title="Popular Locations" sub="Dedicated pages for towns across Kakinada district." cta="All Locations" to="/locations" />
        <PopularLocations locations={LOCS} />
      </section>

      <section className={S}>
        <SectionHead title="Explore by Location" cta="View All Locations" to="/locations" />
        <div className="flex flex-wrap gap-3">
          {LOCATIONS.map((l) => <Link key={l.slug} to={`/locations/${l.slug}`} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 font-medium hover:border-primary hover:text-primary"><MapPin className="h-4 w-4" />{l.name}</Link>)}
          <Link to="/locations" className="rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground">More Locations</Link>
        </div>
      </section>

      <section className={S}>
        <SectionHead title="What's Happening in Kakinada?" cta="All Events" to="/events" />
        <Chips items={["Business", "Cultural", "Religious", "Sports", "Education", "Entertainment", "Community"]} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{EVENTS.map((e) => <EventCard key={e.slug} e={e} />)}</div>
      </section>

      <section className={`${S} grid gap-5 lg:grid-cols-2`}>
        {[{ t: "Healthcare in Kakinada", I: Hospital, items: ["Hospitals", "Clinics", "Doctors", "Dental", "Diagnostic Centres", "Pharmacies", "Ambulance"] },
          { t: "Education in Kakinada", I: GraduationCap, items: ["Schools", "Colleges", "Universities", "Coaching", "Tuition", "Training Institutes", "Study Abroad"] }].map(({ t, I, items }) => (
          <div key={t} className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><I /></span><h2 className="text-xl font-extrabold">{t}</h2></div>
            <div className="mt-5 flex flex-wrap gap-2">{items.map((x) => <Link key={x} to={`/search?q=${encodeURIComponent(String(x))}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:text-primary">{x}</Link>)}</div>
          </div>
        ))}
      </section>

      <section id="emergency" className={S}>
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-2xl font-extrabold">Important Numbers</h2>
          <p className="text-sm text-muted-foreground">National helplines. Tap to call.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {EMERGENCY.map((e) => <a key={e.label} href={`tel:${e.num}`} className="rounded-xl bg-card p-4 shadow-sm"><Phone className="h-4 w-4 text-destructive" /><p className="mt-2 text-2xl font-extrabold">{e.num}</p><p className="text-xs text-muted-foreground">{e.label}</p></a>)}
          </div>
        </div>
      </section>

      <section id="news" className={S}>
        <SectionHead title="Kakinada Updates" />
        <div className="grid gap-5 md:grid-cols-3">
          {NEWS.map((n) => (
            <article key={n.title} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold text-primary">{n.category}</span><span className="text-muted-foreground">{n.date}</span><Demo /></div>
              <h3 className="mt-2 font-bold">{n.title}</h3><p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
              <p className="mt-3 text-xs text-muted-foreground">Source: {n.source}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={S}>
        <div className="grid gap-8 rounded-3xl bg-primary p-8 text-primary-foreground sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Own a Business in Kakinada?</h2>
            <p className="mt-3 opacity-90">Get discovered by local customers.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard" className="rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground">List Your Business — FREE</Link>
              <Link to="/dashboard" className="rounded-xl border border-primary-foreground/40 px-5 py-3 font-semibold">Advertise With Us</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 self-center">
            {["Free listing", "Business profile", "Photos", "Location", "Customer reviews", "Contact enquiries", "Increased visibility"].map((b) => <li key={b} className="flex items-center gap-2"><Check className="h-5 w-5" />{b}</li>)}
          </ul>
        </div>
      </section>

      <section className={`${S} grid items-center gap-10 lg:grid-cols-2`}>
        <div>
          <h2 className="text-3xl font-extrabold">HelloKakinada on Your Phone</h2>
          <p className="mt-2 text-muted-foreground">Discover Kakinada wherever you go.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 font-semibold text-background"><Smartphone className="h-5 w-5" />Download Android App</button>
            <button disabled className="rounded-xl border px-5 py-3 font-semibold text-muted-foreground">Coming Soon on iOS</button>
          </div>
        </div>
        <div className="mx-auto w-60 rounded-[2.5rem] border-8 border-foreground bg-background p-3 shadow-[var(--shadow-lg)]">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-foreground/20" />
          <p className="font-extrabold">Hello<span className="text-primary">Kakinada</span></p>
          <div className="mt-3 rounded-xl bg-secondary p-2 text-xs text-muted-foreground">Search Kakinada…</div>
          <div className="mt-3 grid grid-cols-3 gap-2">{CATS.map(({ label, Icon, c }) => <div key={label} className="flex flex-col items-center gap-1 text-[10px]"><span className={`grid h-9 w-9 place-items-center rounded-lg ${c}`}><Icon className="h-4 w-4" /></span>{label}</div>)}</div>
          <img src={PLACES[0]?.image} alt="" loading="lazy" className="mt-3 aspect-video w-full rounded-xl object-cover" />
        </div>
      </section>
    </>
  );
}
