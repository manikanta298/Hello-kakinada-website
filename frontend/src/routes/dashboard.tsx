import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page } from "@/components/site";

export const path = "/dashboard";
const routeMeta = {
  head: () => ({ meta: [{ title: "Business Dashboard — HelloKakinada.in" }, { name: "description", content: "List your business, post jobs and manage your listing on HelloKakinada.in." }, { property: "og:title", content: "Business Dashboard — HelloKakinada.in" }, { property: "og:description", content: "List your business for free." }] }),
  component: () => (
    <Page title="Business Dashboard" sub="List your business, post jobs or properties. Owner accounts are launching soon.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Add business", "Post a job", "Post a property", "Edit listing", "Upload photos", "Manage reviews", "View enquiries", "Analytics", "Promote listing", "Account"].map((x) => <button key={x} className="rounded-2xl border bg-card p-5 text-left hover:border-primary"><p className="font-bold">{x}</p><p className="mt-1 text-sm text-muted-foreground">Coming soon</p></button>)}</div>
    </Page>
  ),
};
export default routeMeta;

