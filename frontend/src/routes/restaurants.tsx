import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Page, Grid, RestaurantCard, Chips } from "@/components/site";
import { RESTAURANTS } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/restaurants";
const routeMeta = {
  head: () => seo("Restaurants in Kakinada — HelloKakinada.in", "Biryani, tiffins, cafes, sweets and more — find places to eat in Kakinada.", "/restaurants"),
  component: P,
};
export default routeMeta;

function P() {
  const [c, setC] = useState(""); const [open, setOpen] = useState(false);
  const list = RESTAURANTS.filter((r) => (!c || r.cuisine === c) && (!open || r.open));
  return (
    <Page title="Restaurants in Kakinada" sub="What's good to eat around town.">
      <label className="mb-4 inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3"><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />Open now</label>
      <Chips items={["Biryani", "Tiffins", "Cafe", "Sweets"]} value={c} onChange={setC} />
      <Grid>{list.map((r) => <RestaurantCard key={r.slug} r={r} />)}</Grid>
    </Page>
  );
}
