import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { Page } from "@/components/site";
import { seo } from "@/lib/seo";

export const path = "/about";
const routeMeta = {
  head: () => seo("About HelloKakinada.in", "HelloKakinada.in is an independent local platform for the people and businesses of Kakinada.", "/about"),
  component: () => (
    <Page title="About HelloKakinada.in" sub="Your City. Your People. Your Hello Kakinada.">
      <div className="max-w-2xl space-y-4 text-muted-foreground">
        <p>HelloKakinada.in is an independent, privately run platform to discover businesses, jobs, homes, food, services and events in Kakinada.</p>
        <p>We are not a government website. For official services visit <a className="text-primary underline" href="https://kakinada.ap.gov.in" target="_blank" rel="noreferrer">the Kakinada district website</a>.</p>
        <p>Listings marked "Demo" are sample content. Verification badges appear only after we verify a listing.</p>
      </div>
    </Page>
  ),
};
export default routeMeta;

