import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { MediaAnalytics } from "@/components/admin/media-analytics";

export const path = "/_authenticated/admin/analytics";
const routeMeta = {
  head: () => ({ meta: [{ title: "Analytics — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <MediaAnalytics entity="all" permission="analytics" title="Analytics" />,
};
export default routeMeta;

