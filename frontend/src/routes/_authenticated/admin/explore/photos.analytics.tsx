import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { MediaAnalytics } from "@/components/admin/media-analytics";

export const path = "/_authenticated/admin/explore/photos/analytics";
const routeMeta = {
  head: () => ({ meta: [{ title: "Photo Analytics — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <MediaAnalytics entity="photos" permission="photos" title="Photo Analytics" />,
};
export default routeMeta;

