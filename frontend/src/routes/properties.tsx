import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Page, Grid, PropertyCard, Chips } from "@/components/site";
import { PROPERTIES, LOCATIONS } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/properties";
const routeMeta = {
  head: () => seo("Flats & Houses for Rent or Sale in Kakinada — HelloKakinada.in", "Find flats for rent, houses and plots for sale across Kakinada.", "/properties"),
  component: P,
};
export default routeMeta;

function P() {
  const [mode, setMode] = useState(""); const [loc, setLoc] = useState(""); const [bhk, setBhk] = useState("");
  const list = PROPERTIES.filter((p) => (!mode || p.mode === mode) && (!loc || p.location === loc) && (!bhk || p.bhk === bhk));
  return (
    <Page title="Properties in Kakinada" sub="Rent or buy homes across the city.">
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-xl border bg-card px-4 py-3"><option value="">All locations</option>{LOCATIONS.map((l) => <option key={l.slug}>{l.name}</option>)}</select>
        <select value={bhk} onChange={(e) => setBhk(e.target.value)} className="rounded-xl border bg-card px-4 py-3"><option value="">Any BHK</option>{["1 BHK", "2 BHK", "3 BHK", "4 BHK"].map((b) => <option key={b}>{b}</option>)}</select>
      </div>
      <Chips items={["Buy", "Rent"]} value={mode} onChange={setMode} />
      <Grid>{list.map((p) => <PropertyCard key={p.slug} p={p} />)}</Grid>
    </Page>
  );
}
