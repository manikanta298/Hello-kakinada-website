import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { ContentManager } from "@/components/admin/content-manager";
import { SECTIONS } from "@/lib/admin/sections";

export const path = "/_authenticated/admin/events";
const routeMeta = {
  head: () => ({ meta: [{ title: "Events — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ContentManager config={SECTIONS["events"]!} />,
};
export default routeMeta;

