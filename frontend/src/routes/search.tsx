import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { SearchBar, Page, Grid, BusinessCard, JobCard, PropertyCard, RestaurantCard, EventCard } from "@/components/site";
import { search } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/search";
const routeMeta = {
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({ ...seo("Search Kakinada — HelloKakinada.in", "Search businesses, jobs, properties, food and events across Kakinada.", "/search"), meta: [...seo("Search Kakinada — HelloKakinada.in", "Search businesses, jobs, properties, food and events across Kakinada.", "/search").meta, { name: "robots", content: "noindex" }] }),
  component: SearchPage,
};
export default routeMeta;


function Block({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  if (!n) return null;
  return <section className="mt-10"><h2 className="mb-4 text-xl font-bold">{title} <span className="text-muted-foreground">({n})</span></h2><Grid>{children}</Grid></section>;
}

function SearchPage() {
  const { q } = routeMeta.validateSearch(useRawSearch());
  const r = search(q);
  const total = r.jobs.length + r.properties.length + r.restaurants.length + r.businesses.length + r.events.length;
  return (
    <Page title={q ? `Results for “${q}”` : "Search Kakinada"} sub={r.location ? `Showing results in ${r.location}` : undefined}>
      <div className="sticky top-16 z-30 -mx-4 bg-background/90 px-4 py-2 backdrop-blur"><SearchBar key={q} initial={q} /></div>
      {total === 0 && <p className="mt-10 text-muted-foreground">No matches yet. Try "jobs in Kakinada" or "2BHK rent".</p>}
      <Block title="Restaurants" n={r.restaurants.length}>{r.restaurants.map((x) => <RestaurantCard key={x.slug} r={x} />)}</Block>
      <Block title="Businesses" n={r.businesses.length}>{r.businesses.map((x) => <BusinessCard key={x.slug} b={x} />)}</Block>
      <Block title="Jobs" n={r.jobs.length}>{r.jobs.map((x) => <JobCard key={x.slug} j={x} />)}</Block>
      <Block title="Properties" n={r.properties.length}>{r.properties.map((x) => <PropertyCard key={x.slug} p={x} />)}</Block>
      <Block title="Events" n={r.events.length}>{r.events.map((x) => <EventCard key={x.slug} e={x} />)}</Block>
    </Page>
  );
}
