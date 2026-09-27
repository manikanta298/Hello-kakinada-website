import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page, Demo, ReportLink } from "@/components/site";
import { PROPERTIES } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/property/$slug";
const routeMeta = {
  loader: ({ params }) => { const p = PROPERTIES.find((x) => x.slug === params.slug); if (!p) throw new Response("Not Found", { status: 404 }); return p; },
  head: ({ loaderData: p }) => p ? seo(`${p.bhk} ${p.type} for ${p.mode} in ${p.location}, Kakinada`, `${p.bhk} ${p.type}, ${p.area}, ${p.price}.`, `/property/${p.slug}`, "article") : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: D,
};
export default routeMeta;

function D() {
  const p = useLoaderData() as any;
  return (
    <Page title={`${p.bhk} ${p.type} for ${p.mode}`} sub={`${p.location}, Kakinada`}>
      <img src={p.image} alt={p.bhk} className="aspect-[16/7] w-full rounded-2xl object-cover" />
      <div className="mt-6 flex items-center gap-3"><p className="text-3xl font-extrabold">{p.price}</p><Demo /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{[["Type", p.type], ["BHK", p.bhk], ["Area", p.area], ["Location", p.location]].map(([k, v]) => <div key={k} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="font-bold">{v}</p></div>)}</div>
      <section className="mt-6"><h2 className="text-xl font-bold">Amenities & description</h2><p className="mt-1 text-muted-foreground">To be provided by the owner or agent.</p></section>
      <iframe title="Map" loading="lazy" className="mt-6 h-64 w-full rounded-2xl border" src={`https://www.google.com/maps?q=${encodeURIComponent(p.location + " Kakinada")}&output=embed`} />
      <div className="mt-6 flex gap-3"><button disabled className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground opacity-60">Send enquiry (demo)</button><ReportLink /></div>
    </Page>
  );
}
