import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { Page, EventCard, Chips } from "@/components/site";
import { EVENTS } from "@/lib/data";
import { seo } from "@/lib/seo";

export const path = "/events";
const routeMeta = {
  head: () => seo("Events in Kakinada — HelloKakinada.in", "Cultural, business, sports and community events happening in Kakinada.", "/events"),
  component: P,
};
export default routeMeta;

function P() {
  const [c, setC] = useState("");
  return (
    <Page title="What's Happening in Kakinada?">
      <Chips items={["Business", "Cultural", "Religious", "Sports", "Education", "Entertainment", "Community"]} value={c} onChange={setC} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{EVENTS.filter((e) => !c || e.category === c).map((e) => <EventCard key={e.slug} e={e} />)}</div>
    </Page>
  );
}
