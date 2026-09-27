import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page, Demo } from "@/components/site";
import { EVENTS } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/event/$slug";
const routeMeta = {
  loader: ({ params }) => { const e = EVENTS.find((x) => x.slug === params.slug); if (!e) throw new Response("Not Found", { status: 404 }); return e; },
  head: ({ loaderData: e }) => e ? seo(`${e.name} — ${e.location}, Kakinada`, `${e.category} event at ${e.venue}, ${e.location}.`, `/event/${e.slug}`, "article") : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: D,
};
export default routeMeta;

function D() {
  const e = useLoaderData() as any;
  return (
    <Page title={e.name} sub={`${e.date} · ${e.time} · ${e.venue}, ${e.location}`}>
      <img src={e.image} alt={e.name} className="aspect-[16/7] w-full rounded-2xl object-cover" />
      <div className="mt-4"><Demo /></div>
      <section className="mt-4"><h2 className="text-xl font-bold">About this event</h2><p className="mt-1 text-muted-foreground">Details, organizer and contact will be provided by the organizer.</p></section>
      <iframe title="Map" loading="lazy" className="mt-6 h-64 w-full rounded-2xl border" src={`https://www.google.com/maps?q=${encodeURIComponent(e.location + " Kakinada")}&output=embed`} />
      <button disabled className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground opacity-60">Register (demo)</button>
    </Page>
  );
}
