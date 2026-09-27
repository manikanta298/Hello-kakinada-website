import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { seo } from "@/lib/seo";
import { ExploreFeed } from "@/components/explore-feed";

export const path = "/explore";
const routeMeta = {
  head: () => seo("Explore Kakinada — Reels & Photos | HelloKakinada.in", "Swipe through short reels and photos of Kakinada's food, places, events and local businesses.", "/explore"),
  component: ExploreFeed,
};
export default routeMeta;

