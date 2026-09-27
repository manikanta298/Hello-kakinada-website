import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { ContentManager } from "@/components/admin/content-manager";
import { SECTIONS } from "@/lib/admin/sections";

export const path = "/_authenticated/admin/properties";
const routeMeta = {
  head: () => ({ meta: [{ title: "Rent / Buy — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ContentManager config={SECTIONS["properties"]!} />,
};
export default routeMeta;

