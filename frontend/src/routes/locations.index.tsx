import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { MapPin } from "lucide-react";
import { Page } from "@/components/site";
import { LOCATIONS } from "@/lib/data";
import { getLocations } from "@/lib/locations.functions";
import { PopularLocations } from "@/components/popular-locations";
import { seo } from "@/lib/seo";

export const path = "/locations/";
const routeMeta = {
  head: () => seo("Kakinada Areas & Localities — HelloKakinada.in", "Explore businesses, jobs, properties and food by town and locality across Kakinada district.", "/locations"),
  loader: () => getLocations(),
  component: P,
};
export default routeMeta;

function P() {
  const locs = useLoaderData() as any;
  return (
    <Page title="Explore by Location">
      <h2 className="mb-4 text-xl font-bold">Popular towns</h2>
      <PopularLocations locations={locs} />
      <h2 className="mb-4 mt-10 text-xl font-bold">Kakinada city localities</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{LOCATIONS.map((l) => <Link key={l.slug} to={`/locations/${l.slug}`} className="flex items-center gap-3 rounded-2xl border bg-card p-5 font-bold hover:border-primary"><MapPin className="text-primary" />{l.name}</Link>)}</div>
    </Page>
  );
}
