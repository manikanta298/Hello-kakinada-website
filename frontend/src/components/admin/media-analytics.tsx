import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Guard, Kpi, PageHeader, Panel, RangeTabs, rangeDays, Empty } from "./ui";
import { TrendChart } from "./charts";
import { bucketSeries, db, fmt, rangeStart, type Row } from "@/lib/admin/db";
import { ENTITY_LABEL } from "@/lib/admin/sections";

export function MediaAnalytics({ entity, permission, title }: { entity: "videos" | "photos" | "all"; permission: string; title: string }) {
  const [range, setRange] = useState("30d");
  const days = rangeDays(range);
  const q = useQuery({
    queryKey: ["analytics", entity, range],
    queryFn: async () => {
      let iq = db.from("media_interactions").select("entity_type,entity_id,kind,created_at").gte("created_at", rangeStart(days).toISOString()).order("created_at", { ascending: false }).limit(20000);
      if (entity !== "all") iq = iq.eq("entity_type", entity);
      const { data: events } = await iq;
      const tables = entity === "all" ? ["videos", "photos", "businesses", "jobs", "properties", "events", "food_places", "services"] : [entity];
      const items = (await Promise.all(tables.map(async (t) => ((await db.from(t).select("id,title,image_url,views,likes,shares").order("views", { ascending: false }).limit(10)).data ?? []).map((r: Row) => ({ ...r, type: t }))))).flat();
      const counts = await Promise.all(tables.map(async (t) => (await db.from(t).select("id", { count: "exact", head: true })).count ?? 0));
      return { events: (events ?? []) as Row[], items, total: counts.reduce((a, b) => a + b, 0) };
    },
  });
  const ev = q.data?.events ?? [];
  const perItem = new Map<string, Row>();
  for (const e of ev) {
    const r = perItem.get(e.entity_id) ?? { view: 0, like: 0, share: 0 };
    r[e.kind]++;
    perItem.set(e.entity_id, r);
  }
  const series = bucketSeries(ev as { created_at: string }[], days, [
    { key: "views", match: (r) => r.kind === "view" },
    { key: "likes", match: (r) => r.kind === "like" },
    { key: "shares", match: (r) => r.kind === "share" },
  ]);
  const sum = (k: string) => ev.filter((e) => e.kind === k).length;
  const top = [...(q.data?.items ?? [])].map((i) => ({ ...i, rv: perItem.get(i.id)?.view ?? 0, rl: perItem.get(i.id)?.like ?? 0, rs: perItem.get(i.id)?.share ?? 0 }))
    .sort((a, b) => (range === "all" ? b.views - a.views : b.rv - a.rv || b.views - a.views)).slice(0, 10);

  return (
    <Guard section={permission}>
      <PageHeader title={title} sub="Views, likes and shares recorded on the website." actions={<RangeTabs value={range} onChange={setRange} options={["today", "7d", "30d", "all"]} />} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={entity === "all" ? "Total content" : `Total ${entity}`} value={fmt.number(q.data?.total ?? 0)} />
        <Kpi label="Views" value={fmt.number(sum("view"))} />
        <Kpi label="Likes" value={fmt.number(sum("like"))} />
        <Kpi label="Shares" value={fmt.number(sum("share"))} />
        {entity === "videos" && <><Kpi label="Average watch time" value="—" hint="Starts once the player reports watch time" /><Kpi label="Completion rate" value="—" hint="Starts once the player reports completions" /></>}
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Views over time"><TrendChart data={series} series={[{ key: "views", label: "Views" }]} /></Panel>
        <Panel title="Likes over time"><TrendChart data={series} series={[{ key: "likes", label: "Likes" }]} type="bar" /></Panel>
        <Panel title="Shares over time"><TrendChart data={series} series={[{ key: "shares", label: "Shares" }]} type="bar" /></Panel>
      </div>
      <Panel title="Top performing">
        {top.length === 0 ? <Empty>No activity yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="py-2 font-medium">Item</th><th className="py-2 font-medium">Views</th><th className="py-2 font-medium">Likes</th><th className="py-2 font-medium">Shares</th><th className="py-2 font-medium">In range</th></tr></thead>
            <tbody>{top.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="py-2"><div className="flex items-center gap-3">{i.image_url ? <img src={i.image_url} alt="" className="h-9 w-12 rounded object-cover" /> : <span className="h-9 w-12 rounded bg-muted" />}<div><p className="font-semibold">{i.title}</p>{entity === "all" && <p className="text-xs text-muted-foreground">{ENTITY_LABEL[i.type]}</p>}</div></div></td>
                <td>{fmt.number(i.views)}</td><td>{fmt.number(i.likes)}</td><td>{fmt.number(i.shares)}</td>
                <td className="text-xs text-muted-foreground">{i.rv} views · {i.rl} likes · {i.rs} shares</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Panel>
    </Guard>
  );
}
