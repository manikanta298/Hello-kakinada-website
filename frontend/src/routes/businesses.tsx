import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Page, Grid, BusinessCard, Chips } from "@/components/site";
import { LOCATIONS } from "@/lib/data";
import { getBusinesses } from "@/lib/listings.functions";
import { seo } from "@/lib/seo";

export const path = "/businesses";
const routeMeta = {
  head: () => seo("Businesses in Kakinada — HelloKakinada.in", "Browse local businesses in Kakinada by category and area.", "/businesses"),
  loader: () => getBusinesses(),
  component: P,
};
export default routeMeta;

function P() {
  const BUSINESSES = useLoaderData() as any;
  const [q, setQ] = useState(""); const [loc, setLoc] = useState(""); const [open, setOpen] = useState(false); const [map, setMap] = useState(false);
  const list = BUSINESSES.filter((b) => (!q || (b.name + b.category).toLowerCase().includes(q.toLowerCase())) && (!loc || b.location === loc) && (!open || b.open));
  return (
    <Page title="Businesses in Kakinada" sub="Discover shops, agencies and local businesses across the city.">
      <div className="mb-4 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses" className="flex-1 rounded-xl border bg-card px-4 py-3" />
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-xl border bg-card px-4"><option value="">All locations</option>{LOCATIONS.map((l) => <option key={l.slug}>{l.name}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border bg-card px-4"><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />Open now</label>
        <button onClick={() => setMap(!map)} className="rounded-xl bg-secondary px-4 font-semibold">{map ? "List view" : "Map view"}</button>
      </div>
      <Chips items={[...new Set(BUSINESSES.map((b) => b.category))] as string[]} value={q} onChange={setQ} />
      {map ? <iframe title="Map of Kakinada" className="h-[480px] w-full rounded-2xl border" loading="lazy" src="https://www.google.com/maps?q=Kakinada&output=embed" /> : <Grid>{list.map((b) => <BusinessCard key={b.slug} b={b} />)}</Grid>}
    </Page>
  );
}
