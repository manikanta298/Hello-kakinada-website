import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Store, List, Briefcase, Building2, Clapperboard, Image, Eye, Heart, Plus, UserPlus, AlertCircle, ChevronRight } from "lucide-react";
import { Kpi, PageHeader, Panel, RangeTabs, rangeDays, Empty } from "@/components/admin/ui";
import { TrendChart } from "@/components/admin/charts";
import { useAdmin } from "@/components/admin/context";
import { bucketSeries, db, fmt, rangeStart, startOfDay, type Row } from "@/lib/admin/db";
import { ENTITY_LABEL } from "@/lib/admin/sections";

export const path = "/_authenticated/admin/";
const routeMeta = {
  head: () => ({ meta: [{ title: "Dashboard — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
};
export default routeMeta;


const LISTING_TABLES = ["businesses", "jobs", "properties", "events", "food_places", "services"];
const ALL_TABLES = [...LISTING_TABLES, "videos", "photos"];
const count = async (table: string, f?: (q: Row) => Row) => {
  let q: Row = db.from(table).select("id", { count: "exact", head: true });
  if (f) q = f(q);
  return ((await q).count as number) ?? 0;
};

function Dashboard() {
  const { name, can } = useAdmin();
  const [range, setRange] = useState("30d");
  const days = rangeDays(range);
  const today = startOfDay().toISOString();

  const totals = useQuery({
    queryKey: ["dashboard", "totals"],
    queryFn: async () => {
      const [users, ...tables] = await Promise.all([count("profiles"), ...ALL_TABLES.map((t) => count(t))]);
      const by: Row = Object.fromEntries(ALL_TABLES.map((t, i) => [t, tables[i]!]));
      const [views, todayViews, todayLikes, newUsers, ...todayListings] = await Promise.all([
        count("media_interactions", (q) => q.eq("kind", "view")),
        count("media_interactions", (q) => q.eq("kind", "view").gte("created_at", today)),
        count("media_interactions", (q) => q.eq("kind", "like").gte("created_at", today)),
        count("profiles", (q) => q.gte("created_at", today)),
        ...LISTING_TABLES.map((t) => count(t, (q) => q.gte("created_at", today))),
      ]);
      const [pending, pendingReviews, openReports, draftVideos, draftPhotos] = await Promise.all([
        Promise.all(LISTING_TABLES.map((t) => count(t, (q) => q.eq("status", "pending")))).then((a) => a.reduce((x, y) => x + y, 0)),
        count("reviews", (q) => q.eq("status", "pending")),
        count("reports", (q) => q.eq("status", "open")),
        count("videos", (q) => q.eq("status", "draft")),
        count("photos", (q) => q.eq("status", "draft")),
      ]);
      return { users, by, listings: LISTING_TABLES.reduce((a, t) => a + by[t], 0), views, todayViews, todayLikes, newUsers, todayListings: todayListings.reduce((a, b) => a + b, 0), pending, pendingReviews, openReports, draftVideos, draftPhotos };
    },
  });

  const trends = useQuery({
    queryKey: ["dashboard", "trends", range],
    queryFn: async () => {
      const since = rangeStart(days).toISOString();
      const [{ data: ev }, { data: users }, ...lists] = await Promise.all([
        db.from("media_interactions").select("entity_type,kind,created_at").gte("created_at", since).limit(20000),
        db.from("profiles").select("created_at").gte("created_at", since).limit(10000),
        ...LISTING_TABLES.map((t) => db.from(t).select("created_at").gte("created_at", since).limit(5000)),
      ]);
      const events = (ev ?? []) as Row[] as { created_at: string; kind: string; entity_type: string }[];
      return {
        traffic: bucketSeries(events, days, [{ key: "views", match: (r) => r.kind === "view" }, { key: "likes", match: (r) => r.kind === "like" }]),
        media: bucketSeries(events, days, [
          { key: "videos", match: (r) => r.kind === "view" && r.entity_type === "videos" },
          { key: "photos", match: (r) => r.kind === "view" && r.entity_type === "photos" },
        ]),
        listings: bucketSeries(lists.flatMap((l) => (l.data ?? []) as { created_at: string }[]), days),
        users: bucketSeries((users ?? []) as { created_at: string }[], days),
      };
    },
  });

  const activity = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const rows = (await Promise.all(ALL_TABLES.map(async (t) => ((await db.from(t).select("id,title,status,created_at").order("created_at", { ascending: false }).limit(5)).data ?? []).map((r: Row) => ({
        key: t + r.id, at: r.created_at,
        text: t === "videos" ? (r.status === "published" ? "Video published" : "Video added") : t === "photos" ? "Photo uploaded" : t === "jobs" ? "New job posted" : `New ${ENTITY_LABEL[t]!.toLowerCase()} added`,
        detail: r.title,
      }))))).flat();
      const { data: reviews } = await db.from("reviews").select("id,target_title,created_at").order("created_at", { ascending: false }).limit(5);
      const { data: users } = await db.from("profiles").select("id,full_name,email,created_at").order("created_at", { ascending: false }).limit(5);
      rows.push(...(reviews ?? []).map((r: Row) => ({ key: "r" + r.id, at: r.created_at, text: "Review submitted", detail: r.target_title ?? "" })));
      rows.push(...(users ?? []).map((u: Row) => ({ key: "u" + u.id, at: u.created_at, text: "User registered", detail: u.full_name || u.email })));
      return rows.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 10);
    },
  });

  const t = totals.data;
  const n = (v?: number) => (t ? fmt.number(v ?? 0) : "…");
  const quick = [
    { to: "/admin/businesses", label: "Add Business", section: "businesses", icon: Store },
    { to: "/admin/jobs", label: "Add Job", section: "jobs", icon: Briefcase },
    { to: "/admin/properties", label: "Add Property", section: "properties", icon: Building2 },
    { to: "/admin/explore/videos", label: "Add Video", section: "videos", icon: Clapperboard },
    { to: "/admin/explore/photos", label: "Add Photo", section: "photos", icon: Image },
    { to: "/admin/events", label: "Add Event", section: "events", icon: Plus },
  ] as const;
  const attention = [
    { label: "Pending listings", value: t?.pending, to: "/admin/businesses" },
    { label: "Pending reviews", value: t?.pendingReviews, to: "/admin/reviews" },
    { label: "Reported content", value: t?.openReports, to: "/admin/reports" },
    { label: "Draft videos", value: t?.draftVideos, to: "/admin/explore/videos" },
    { label: "Draft photos", value: t?.draftPhotos, to: "/admin/explore/photos" },
  ] as const;

  return (
    <>
      <PageHeader title={`Namaste${name ? `, ${name.split(" ")[0]}` : ""} 👋`} sub="Here's what's happening on HelloKakinada.in." actions={<RangeTabs value={range} onChange={setRange} />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total Users" value={n(t?.users)} icon={<Users className="h-4 w-4" />} />
        <Kpi label="Total Businesses" value={n(t?.by.businesses)} icon={<Store className="h-4 w-4" />} />
        <Kpi label="Total Listings" value={n(t?.listings)} icon={<List className="h-4 w-4" />} />
        <Kpi label="Total Jobs" value={n(t?.by.jobs)} icon={<Briefcase className="h-4 w-4" />} />
        <Kpi label="Total Properties" value={n(t?.by.properties)} icon={<Building2 className="h-4 w-4" />} />
        <Kpi label="Total Videos" value={n(t?.by.videos)} icon={<Clapperboard className="h-4 w-4" />} />
        <Kpi label="Total Photos" value={n(t?.by.photos)} icon={<Image className="h-4 w-4" />} />
        <Kpi label="Total Views" value={n(t?.views)} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border bg-primary/5 p-3 md:grid-cols-4">
        {[["Today's Views", t?.todayViews, Eye], ["Today's Likes", t?.todayLikes, Heart], ["Today's New Listings", t?.todayListings, List], ["Today's New Users", t?.newUsers, UserPlus]].map(([label, v, Icon]) => {
          const I = Icon as typeof Eye;
          return <div key={label as string} className="flex items-center gap-3 px-2 py-1"><span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-primary"><I className="h-4 w-4" /></span><div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-lg font-extrabold">{n(v as number)}</p></div></div>;
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Website traffic · views & likes"><TrendChart data={trends.data?.traffic ?? []} series={[{ key: "views", label: "Views" }, { key: "likes", label: "Likes" }]} height={260} /></Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="New listings"><TrendChart data={trends.data?.listings ?? []} series={[{ key: "count", label: "Listings" }]} type="bar" /></Panel>
            <Panel title="User growth"><TrendChart data={trends.data?.users ?? []} series={[{ key: "count", label: "New users" }]} /></Panel>
            <Panel title="Video performance"><TrendChart data={trends.data?.media ?? []} series={[{ key: "videos", label: "Video views" }]} /></Panel>
            <Panel title="Photo performance"><TrendChart data={trends.data?.media ?? []} series={[{ key: "photos", label: "Photo views" }]} /></Panel>
          </div>
        </div>
        <div className="space-y-4">
          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              {quick.filter((q) => can(q.section)).map((q) => (
                <Link key={q.label} to={q.to} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"><q.icon className="h-4 w-4" />{q.label}</Link>
              ))}
            </div>
          </Panel>
          <Panel title="Needs attention">
            <ul className="-my-1">
              {attention.map((a) => (
                <li key={a.label}><Link to={a.to} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-secondary">
                  <span className="flex items-center gap-2">{(a.value ?? 0) > 0 ? <AlertCircle className="h-4 w-4 text-warning" /> : <span className="h-4 w-4" />}{a.label}</span>
                  <span className="flex items-center gap-1 font-bold">{n(a.value)}<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
                </Link></li>
              ))}
            </ul>
          </Panel>
          <Panel title="Recent activity">
            {activity.data?.length === 0 ? <Empty>Nothing yet — add your first listing.</Empty> : (
              <ol className="space-y-3">
                {activity.data?.map((a) => (
                  <li key={a.key} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="font-medium">{a.text}</p><p className="truncate text-xs text-muted-foreground">{a.detail} · {fmt.ago(a.at)}</p></div></li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
