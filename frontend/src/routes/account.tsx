import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page } from "@/components/site";
import { seo } from "@/lib/seo";

export const path = "/account";
const routeMeta = {
  head: () => ({ ...seo("My Account — HelloKakinada.in", "Saved listings, reviews, enquiries and profile.", "/account"), meta: [{ title: "My Account — HelloKakinada.in" }, { name: "description", content: "Saved listings, reviews, enquiries and profile." }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Page title="My Account" sub="Sign-in is coming soon. Here's what you'll be able to do.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Saved businesses", "Saved jobs", "Saved properties", "Saved restaurants", "Saved places", "My reviews", "My enquiries", "Profile"].map((x) => <div key={x} className="rounded-2xl border bg-card p-5"><p className="font-bold">{x}</p><p className="mt-1 text-sm text-muted-foreground">Nothing here yet</p></div>)}</div>
    </Page>
  ),
};
export default routeMeta;

