import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page } from "@/components/site";
import { SERVICES } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/services";
const routeMeta = {
  head: () => seo("Local Services in Kakinada — HelloKakinada.in", "Electricians, plumbers, AC repair, photographers and more service providers in Kakinada.", "/services"),
  component: P,
};
export default routeMeta;

const GROUPS = { "Home Services": ["Electricians", "Plumbers", "AC Repair", "Cleaning", "Interior Designers"], Automobile: ["Car Repair", "Bike Repair"], "Business Services": ["Printing", "Digital Marketing", "CCTV"], "Event Services": ["Photography", "Event Services"] };
function P() {
  return (
    <Page title="Services in Kakinada" sub="Find local service providers by category. Provider listings are being added.">
      <div className="grid gap-5 md:grid-cols-2">
        {Object.entries(GROUPS).map(([g, items]) => (
          <div key={g} className="rounded-2xl border bg-card p-6"><h2 className="text-lg font-bold">{g}</h2>
            <div className="mt-3 flex flex-wrap gap-2">{items.filter((i) => SERVICES.includes(i)).map((i) => <Link key={i} to={`/search?q=${encodeURIComponent(String(i))}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:text-primary">{i}</Link>)}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}
