import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page, Grid, BusinessCard, JobCard, PropertyCard, RestaurantCard, EventCard } from "@/components/site";
import { getBusinesses, getJobs } from "@/lib/listings.functions";
import { LOCATIONS, PROPERTIES, RESTAURANTS, EVENTS } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/locations/$slug";
const routeMeta = {
  loader: async ({ params }) => { const l = LOCATIONS.find((x) => x.slug === params.slug); if (!l) throw new Response("Not Found", { status: 404 }); const [bs, js] = await Promise.all([getBusinesses(), getJobs()]); return { ...l, BUSINESSES: bs, JOBS: js }; },
  head: ({ loaderData: l }) => l ? { ...seo(`${l.name}, Kakinada — Businesses, Jobs & Homes | HelloKakinada.in`, `Local businesses, jobs, properties, restaurants and events in ${l.name}, Kakinada.`, `/locations/${l.slug}`),
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Locations", item: "/locations" }, { "@type": "ListItem", position: 2, name: l.name }] }) }] } : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: D,
};
export default routeMeta;

function S({ t, n, children }: { t: string; n: number; children: React.ReactNode }) {
  if (!n) return null; // skip empty sections to avoid thin content
  return <section className="mt-10"><h2 className="mb-4 text-xl font-bold">{t}</h2><Grid>{children}</Grid></section>;
}
function D() {
  const l = useLoaderData() as any; const { BUSINESSES, JOBS } = l; const f = (a: any[]) => a.filter((x: any) => x.location === l.name);
  const b = f(BUSINESSES), j = f(JOBS), p = f(PROPERTIES), r = f(RESTAURANTS), e = f(EVENTS);
  const empty = !b.length && !j.length && !p.length && !r.length && !e.length;
  return (
    <Page title={`${l.name}, Kakinada`} sub={`What's listed in ${l.name}.`}>
      <nav className="-mt-4 mb-4 text-sm text-muted-foreground"><Link to="/locations" className="hover:text-primary">Locations</Link> / {l.name}</nav>
      {empty && <p className="text-muted-foreground">No listings in {l.name} yet. <Link to="/dashboard" className="font-semibold text-primary">Add the first one</Link>.</p>}
      <S t={`Businesses in ${l.name}`} n={b.length}>{b.map((x) => <BusinessCard key={x.slug} b={x} />)}</S>
      <S t={`Restaurants in ${l.name}`} n={r.length}>{r.map((x) => <RestaurantCard key={x.slug} r={x} />)}</S>
      <S t={`Jobs in ${l.name}`} n={j.length}>{j.map((x) => <JobCard key={x.slug} j={x} />)}</S>
      <S t={`Properties in ${l.name}`} n={p.length}>{p.map((x) => <PropertyCard key={x.slug} p={x} />)}</S>
      <S t={`Events in ${l.name}`} n={e.length}>{e.map((x) => <EventCard key={x.slug} e={x} />)}</S>
    </Page>
  );
}
