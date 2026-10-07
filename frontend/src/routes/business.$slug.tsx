import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { RichText } from "@/components/rich-text";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Phone, MessageCircle, Globe, Clock, MapPin } from "lucide-react";
import { BusinessCard, Demo, Verified, ReportLink, Grid, ListingMeta } from "@/components/site";
import { getBusiness, getBusinesses } from "@/lib/listings.functions";
import { seo } from "@/lib/seo";
import { BusinessGallery } from "@/components/business-gallery";

export const path = "/business/$slug";
const routeMeta = {
  loader: async ({ params }) => {
    const [b, all] = await Promise.all([getBusiness({ data: { slug: params.slug } }), getBusinesses()]);
    if (!b) throw new Response("Not Found", { status: 404 });
    return { b, related: all.filter((x) => x.slug !== b.slug).slice(0, 4) };
  },
  head: ({ loaderData }) => { const b = loaderData?.b; return b ? { ...seo(`${b.name} — ${b.category} in ${b.location}, Kakinada`, b.about || `${b.name} in ${b.location}, Kakinada.`, `/business/${b.slug}`, "business.business"), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: b.name, ...(b.phone ? { telephone: b.phone } : {}), ...(b.link ? { url: b.link } : {}), address: { "@type": "PostalAddress", ...(b.address ? { streetAddress: b.address } : {}), addressLocality: b.location, addressRegion: "Andhra Pradesh" } }) }] } : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] }; },
  errorComponent: () => <div className="p-10 text-center">Couldn't load this business. Please try again.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Business not found.</div>,
  component: D,
};
export default routeMeta;

function D() {
  const { b, related } = useLoaderData() as any;
  const wa = b.whatsapp?.replace(/\D/g, "").slice(-10);
  const actions: [string, typeof Phone, string | undefined][] = [
    ["Call", Phone, b.phone ? `tel:${b.phone}` : undefined],
    ["WhatsApp", MessageCircle, wa ? `https://wa.me/91${wa}` : undefined],
    ["Website", Globe, b.link],
  ];
  const real = !!b.addedAt;
  return (
    <div>
      <BusinessGallery images={b.images?.length ? b.images : [b.image]} name={b.name} fallback="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=70" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-center gap-2">{!real && <Demo />}{(!real || b.verified) && <Verified />}</div>
          <h1 className="mt-2 text-3xl font-extrabold">{b.name}</h1>
          <p className="text-muted-foreground">{b.category} · <MapPin className="inline h-4 w-4" /> {b.location}, Kakinada · No reviews yet</p>
          <ListingMeta addedAt={b.addedAt} link={b.link} />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {actions.map(([l, I, href]) => href
              ? <a key={l} href={href} target={l === "Call" ? undefined : "_blank"} rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"><I className="h-4 w-4" />{l}</a>
              : <button key={l} disabled className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 font-semibold text-muted-foreground"><I className="h-4 w-4" />{l}</button>)}
          </div>
          {!real && <p className="mt-2 text-xs text-muted-foreground">Contact details appear once the owner claims this listing.</p>}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section><h2 className="text-xl font-bold">About</h2><RichText html={b.about || "Not provided"} className="mt-2 text-muted-foreground" /></section>
            {b.services.length > 0 && <section><h2 className="text-xl font-bold">Services</h2><div className="mt-2 flex flex-wrap gap-2">{b.services.map((s) => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm">{s}</span>)}</div></section>}
            <section><h2 className="text-xl font-bold">Reviews</h2><p className="mt-2 text-muted-foreground">No reviews yet. Be the first once accounts launch.</p></section>
          </div>
          <aside className="space-y-4">
            {b.address && <div className="rounded-2xl border bg-card p-4"><p className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4" />Address</p><p className="mt-1 text-sm text-muted-foreground">{b.address}</p></div>}
            <div className="rounded-2xl border bg-card p-4"><p className="flex items-center gap-2 font-bold"><Clock className="h-4 w-4" />Opening hours</p><p className="mt-1 text-sm text-muted-foreground">{b.hours ?? "Not provided"}</p></div>
            <iframe title="Location" loading="lazy" className="h-56 w-full rounded-2xl border" src={`https://www.google.com/maps?q=${encodeURIComponent((b.address ?? b.location) + " Kakinada")}&output=embed`} />
            <ReportLink />
          </aside>
        </div>
        <h2 className="mb-4 mt-12 text-xl font-bold">Related businesses</h2>
        <Grid>{related.map((x) => <BusinessCard key={x.slug} b={x} />)}</Grid>
      </div>
    </div>
  );
}
