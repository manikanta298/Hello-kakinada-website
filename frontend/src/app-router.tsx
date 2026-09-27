import type { RouteObject } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useSeo, RouteErrorBoundary } from "@/lib/router-shim";

import RootLayout, { RootErrorElement, NotFoundPage } from "./routes/__root";
import AuthenticatedLayout, { authenticatedLoader } from "./routes/_authenticated/route";
import AdminLayout, { adminLoader } from "./routes/_authenticated/admin/route";

import * as IndexRoute from "./routes/index";
import * as AboutRoute from "./routes/about";
import * as AccountRoute from "./routes/account";
import * as AuthRoute from "./routes/auth";
import * as BestHotelsRoute from "./routes/best-hotels-in-kakinada";
import * as BusinessSlugRoute from "./routes/business.$slug";
import * as BusinessesRoute from "./routes/businesses";
import * as DashboardRoute from "./routes/dashboard";
import * as EventSlugRoute from "./routes/event.$slug";
import * as EventsRoute from "./routes/events";
import * as ExploreRoute from "./routes/explore";
import * as JobSlugRoute from "./routes/job.$slug";
import * as JobsRoute from "./routes/jobs";
import * as LocationsIndexRoute from "./routes/locations.index";
import * as LocationSlugRoute from "./routes/locations.$slug";
import * as PropertiesRoute from "./routes/properties";
import * as PropertySlugRoute from "./routes/property.$slug";
import * as RestaurantsRoute from "./routes/restaurants";
import * as SearchRoute from "./routes/search";
import * as ServicesRoute from "./routes/services";
import * as CatchAllLocationRoute from "./routes/$location";

import * as AdminIndexRoute from "./routes/_authenticated/admin/index";
import * as AdminBusinessesRoute from "./routes/_authenticated/admin/businesses";
import * as AdminJobsRoute from "./routes/_authenticated/admin/jobs";
import * as AdminPropertiesRoute from "./routes/_authenticated/admin/properties";
import * as AdminEventsRoute from "./routes/_authenticated/admin/events";
import * as AdminFoodRoute from "./routes/_authenticated/admin/food";
import * as AdminServicesRoute from "./routes/_authenticated/admin/services";
import * as AdminLocationsRoute from "./routes/_authenticated/admin/locations";
import * as AdminNotificationsRoute from "./routes/_authenticated/admin/notifications";
import * as AdminReviewsRoute from "./routes/_authenticated/admin/reviews";
import * as AdminReportsRoute from "./routes/_authenticated/admin/reports";
import * as AdminRolesRoute from "./routes/_authenticated/admin/roles";
import * as AdminSettingsRoute from "./routes/_authenticated/admin/settings";
import * as AdminUsersRoute from "./routes/_authenticated/admin/users";
import * as AdminAdminUsersRoute from "./routes/_authenticated/admin/admin-users";
import * as AdminImportRoute from "./routes/_authenticated/admin/import";
import * as AdminAnalyticsRoute from "./routes/_authenticated/admin/analytics";
import * as AdminExploreCategoriesRoute from "./routes/_authenticated/admin/explore/categories";
import * as AdminExploreContentRoute from "./routes/_authenticated/admin/explore/content";
import * as AdminExplorePhotosIndexRoute from "./routes/_authenticated/admin/explore/photos.index";
import * as AdminExplorePhotosAnalyticsRoute from "./routes/_authenticated/admin/explore/photos.analytics";
import * as AdminExploreVideosIndexRoute from "./routes/_authenticated/admin/explore/videos.index";
import * as AdminExploreVideosAnalyticsRoute from "./routes/_authenticated/admin/explore/videos.analytics";

/** A leaf route file's shape after conversion (see src/routes/*.tsx):
 *  `export default { component, loader?, head?, notFoundComponent?, errorComponent? }`. */
type RouteMeta = {
  component: React.ComponentType;
  loader?: (args: any) => any;
  head?: (args: any) => { meta?: { title?: string; name?: string; content?: string }[] } | undefined;
  notFoundComponent?: () => React.ReactNode;
  errorComponent?: () => React.ReactNode;
};

function leaf(mod: { default: RouteMeta }, extra: Partial<RouteObject> = {}): RouteObject {
  const meta = mod.default;
  function Element() {
    const loaderData = meta.loader ? useLoaderData() : undefined;
    useSeo(meta.head?.({ loaderData }));
    const Page = meta.component;
    return <Page />;
  }
  const errorElement =
    meta.notFoundComponent || meta.errorComponent ? (
      <RouteErrorBoundary notFound={meta.notFoundComponent?.()} error={meta.errorComponent?.()} />
    ) : undefined;
  return { loader: meta.loader, Component: Element, errorElement, ...extra } as RouteObject;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <RootErrorElement />,
    children: [
      leaf(IndexRoute, { index: true }),
      { path: "about", ...leaf(AboutRoute) },
      { path: "account", ...leaf(AccountRoute) },
      { path: "auth", ...leaf(AuthRoute) },
      { path: "best-hotels-in-kakinada", ...leaf(BestHotelsRoute) },
      { path: "business/:slug", ...leaf(BusinessSlugRoute) },
      { path: "businesses", ...leaf(BusinessesRoute) },
      { path: "dashboard", ...leaf(DashboardRoute) },
      { path: "event/:slug", ...leaf(EventSlugRoute) },
      { path: "events", ...leaf(EventsRoute) },
      { path: "explore", ...leaf(ExploreRoute) },
      { path: "job/:slug", ...leaf(JobSlugRoute) },
      { path: "jobs", ...leaf(JobsRoute) },
      { path: "locations", ...leaf(LocationsIndexRoute) },
      { path: "locations/:slug", ...leaf(LocationSlugRoute) },
      { path: "properties", ...leaf(PropertiesRoute) },
      { path: "property/:slug", ...leaf(PropertySlugRoute) },
      { path: "restaurants", ...leaf(RestaurantsRoute) },
      { path: "search", ...leaf(SearchRoute) },
      { path: "services", ...leaf(ServicesRoute) },
      {
        Component: AuthenticatedLayout,
        loader: authenticatedLoader,
        children: [
          {
            path: "admin",
            Component: AdminLayout,
            loader: adminLoader,
            children: [
              leaf(AdminIndexRoute, { index: true }),
              { path: "businesses", ...leaf(AdminBusinessesRoute) },
              { path: "jobs", ...leaf(AdminJobsRoute) },
              { path: "properties", ...leaf(AdminPropertiesRoute) },
              { path: "events", ...leaf(AdminEventsRoute) },
              { path: "food", ...leaf(AdminFoodRoute) },
              { path: "services", ...leaf(AdminServicesRoute) },
              { path: "locations", ...leaf(AdminLocationsRoute) },
              { path: "notifications", ...leaf(AdminNotificationsRoute) },
              { path: "reviews", ...leaf(AdminReviewsRoute) },
              { path: "reports", ...leaf(AdminReportsRoute) },
              { path: "roles", ...leaf(AdminRolesRoute) },
              { path: "settings", ...leaf(AdminSettingsRoute) },
              { path: "users", ...leaf(AdminUsersRoute) },
              { path: "admin-users", ...leaf(AdminAdminUsersRoute) },
              { path: "import", ...leaf(AdminImportRoute) },
              { path: "analytics", ...leaf(AdminAnalyticsRoute) },
              { path: "explore/categories", ...leaf(AdminExploreCategoriesRoute) },
              { path: "explore/content", ...leaf(AdminExploreContentRoute) },
              { path: "explore/photos", ...leaf(AdminExplorePhotosIndexRoute) },
              { path: "explore/photos/analytics", ...leaf(AdminExplorePhotosAnalyticsRoute) },
              { path: "explore/videos", ...leaf(AdminExploreVideosIndexRoute) },
              { path: "explore/videos/analytics", ...leaf(AdminExploreVideosAnalyticsRoute) },
            ],
          },
        ],
      },
      { path: ":location", ...leaf(CatchAllLocationRoute) },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
