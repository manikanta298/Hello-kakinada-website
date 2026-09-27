import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo, rawSearchFromRequest } from "@/lib/router-shim";
import { getDirectory } from "@/lib/locations.functions";
import { Directory, parseDirSearch, normDir } from "@/components/directory";
import { seo } from "@/lib/seo";

export const path = "/best-hotels-in-kakinada";
const routeMeta = {
  validateSearch: (s: Record<string, unknown>) => { const { kind: _k, ...r } = parseDirSearch(s); return r; },
  loader: async ({ request }) => (await getDirectory({ data: { ...normDir(rawSearchFromRequest(request)), kind: "hotels" } }))!,
  head: () => seo("Best Hotels in Kakinada – Hotels, Rooms & Stay | HelloKakinada.in", "Compare hotels, lodges and resorts in Kakinada with addresses, phone numbers and WhatsApp contacts from our local directory.", "/best-hotels-in-kakinada"),
  component: HotelsPage,
};
export default routeMeta;


function HotelsPage() {
  const d = useLoaderData() as any;
  const search = { ...normDir(useRawSearch()), kind: "hotels" as const };
  const navigate = useSearchNav();
  return (
    <div>
      <section className="border-b bg-secondary/60">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <nav className="text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">Home</Link> / Best hotels in Kakinada</nav>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Best Hotels in Kakinada</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Hotels, lodges and resorts listed on HelloKakinada — with real addresses and contact numbers so you can call or WhatsApp directly before you book.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Directory data={d} search={search} kinds={["hotels"]} placeName="Kakinada" onChange={(p) => navigate({ search: (s) => { const { kind: _k, ...r } = { ...s, ...p }; return r; }, resetScroll: false })} />
        <div className="mt-10 flex flex-wrap gap-2 border-t pt-6 text-sm">
          {d.others.map((o) => <Link key={o.slug} to={`/${o.slug}?kind=hotels`} className="rounded-full border bg-card px-3 py-1.5 font-semibold hover:border-primary">Hotels in {o.name}</Link>)}
        </div>
      </div>
    </div>
  );
}
