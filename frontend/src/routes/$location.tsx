import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo, rawSearchFromRequest } from "@/lib/router-shim";
import { MapPin } from "lucide-react";
import { getDirectory } from "@/lib/locations.functions";
import { Directory, parseDirSearch, normDir } from "@/components/directory";
import { seo } from "@/lib/seo";

export const path = "/$location";
const routeMeta = {
  validateSearch: (s: Record<string, unknown>) => parseDirSearch(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, request }) => {
    const d = await getDirectory({ data: { slug: params.location, ...normDir(rawSearchFromRequest(request)) } });
    if (!d?.location) throw new Response("Not Found", { status: 404 });
    return d;
  },
  head: ({ loaderData: d }) => {
    if (!d?.location) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const l = d.location;
    const title = l.seo_title || `Businesses, Jobs & Services in ${l.name} | HelloKakinada.in`;
    const desc = l.seo_description || `Local businesses, jobs, hotels, restaurants and services in ${l.name}.`;
    const base = seo(title, desc, `/${l.slug}`);
    return {
      ...base,
      meta: [...base.meta, ...(l.image_url ? [{ property: "og:image", content: l.image_url }, { name: "twitter:image", content: l.image_url }] : [])],
      scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "/" }, { "@type": "ListItem", position: 2, name: "Locations", item: "/locations" }, { "@type": "ListItem", position: 3, name: l.name }] }) }],
    };
  },
  component: LocationPage,
};
export default routeMeta;


function LocationPage() {
  const d = useLoaderData() as any;
  const search = normDir(useRawSearch());
  const navigate = useSearchNav();
  const l = d.location!;
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-secondary/60">
        {l.image_url && <img src={l.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
          <nav className="text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">Home</Link> / <Link to="/locations" className="hover:text-primary">Locations</Link> / {l.name}</nav>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{l.slug === "kakinada" ? "Kakinada Local Directory" : `Businesses, Jobs & Services in ${l.name}`}</h1>
          {l.description && <p className="mt-3 max-w-3xl text-muted-foreground">{l.description}</p>}
          {l.nearby.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">Nearby:</span>{l.nearby.map((n) => {
            const o = d.others.find((x) => x.name.toLowerCase() === n.toLowerCase());
            return o ? <Link key={n} to={`/${o.slug}`} className="rounded-full border bg-card px-3 py-1 hover:border-primary">{n}</Link> : <span key={n} className="rounded-full border bg-card px-3 py-1">{n}</span>;
          })}</div>}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Directory data={d} search={search} placeName={l.name} onChange={(p) => navigate({ search: (s) => ({ ...s, ...p }), resetScroll: false })} />
        <section className="mt-12 border-t pt-8">
          <h2 className="mb-3 text-lg font-bold">Explore other areas</h2>
          <div className="flex flex-wrap gap-2">
            {d.others.map((o) => <Link key={o.slug} to={`/${o.slug}`} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:border-primary"><MapPin className="h-3.5 w-3.5 text-primary" />{o.name}</Link>)}
            <Link to="/best-hotels-in-kakinada" className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:border-primary">Best hotels in Kakinada</Link>
            <Link to="/businesses" className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:border-primary">All businesses</Link>
            <Link to="/jobs" className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:border-primary">All jobs</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
