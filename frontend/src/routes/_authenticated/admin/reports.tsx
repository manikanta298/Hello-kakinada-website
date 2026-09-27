import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { db, fmt, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/reports";
const routeMeta = {
  head: () => ({ meta: [{ title: "Reports — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Reports,
};
export default routeMeta;


const TABLE_FOR: Record<string, string> = { business: "businesses", job: "jobs", property: "properties", video: "videos", photo: "photos", review: "reviews", event: "events", food: "food_places", service: "services" };

function Reports() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let q = db.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const rows = ((await q).data ?? []) as Row[];
      const ids = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))];
      const { data: users } = ids.length ? await db.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      const map = new Map((users ?? []).map((u: Row) => [u.id, u.full_name || u.email]));
      return rows.map((r) => ({ ...r, reporter: map.get(r.reporter_id) ?? "Unknown" }));
    },
  });
  const setStatus = async (r: Row, status: string) => {
    const { error } = await db.from("reports").update({ status }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); qc.invalidateQueries({ queryKey: ["admin-reports"] }); }
  };
  const removeContent = async (r: Row) => {
    const table = TABLE_FOR[r.target_type];
    if (!table || !r.target_id || !confirm("Remove the reported content? It will be deleted.")) return;
    const { error } = await db.from(table).delete().eq("id", r.target_id);
    if (error) { toast.error(error.message); return; }
    await setStatus(r, "resolved");
  };
  return (
    <Guard section="reports">
      <PageHeader title="Reports" sub="Content flagged by visitors." />
      <div className="rounded-2xl border bg-card">
        <div className="flex gap-1 border-b p-3">{["open", "reviewing", "resolved", "dismissed", "all"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-secondary" : "text-muted-foreground"}`}>{f}</button>)}</div>
        {isLoading ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No reports. 🎉</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">{["Type", "Reported content", "Reporter", "Reason", "Date", "Status", "Actions"].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2 capitalize">{r.target_type}</td>
                <td className="px-3 py-2 font-medium">{r.target_title ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.reporter}</td>
                <td className="max-w-xs px-3 py-2">{r.reason}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmt.date(r.created_at)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, "reviewing")}>Review</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, "resolved")}>Resolve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(r, "dismissed")}>Dismiss</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeContent(r)}>Remove content</Button>
                </div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </Guard>
  );
}
