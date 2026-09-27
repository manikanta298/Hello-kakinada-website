import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { MediaAnalytics } from "@/components/admin/media-analytics";

export const path = "/_authenticated/admin/explore/videos/analytics";
const routeMeta = {
  head: () => ({ meta: [{ title: "Video Analytics — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <MediaAnalytics entity="videos" permission="videos" title="Video Analytics" />,
};
export default routeMeta;

