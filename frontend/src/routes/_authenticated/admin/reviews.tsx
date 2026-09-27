import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, EyeOff, Flag, Trash2 } from "lucide-react";
import { Guard, PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { db, fmt, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/reviews";
const routeMeta = {
  head: () => ({ meta: [{ title: "Reviews — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Reviews,
};
export default routeMeta;


function Reviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("q"); if (s) setQ(s); }, []);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", filter, q],
    queryFn: async () => {
      let query = db.from("reviews").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter === "reported") query = query.eq("flagged", true);
      else if (filter !== "all") query = query.eq("status", filter);
      if (q) query = query.ilike("body", `%${q}%`);
      const rows = ((await query).data ?? []) as Row[];
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const { data: users } = ids.length ? await db.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      const map = new Map((users ?? []).map((u: Row) => [u.id, u.full_name || u.email]));
      return rows.map((r) => ({ ...r, user: map.get(r.user_id) ?? "Unknown" }));
    },
  });
  const act = async (r: Row, patch: Row | null, msg: string) => {
    const { error } = patch ? await db.from("reviews").update(patch).eq("id", r.id) : await db.from("reviews").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(msg); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); }
  };
  return (
    <Guard section="reviews">
      <PageHeader title="Reviews" sub="Approve, hide or flag reviews left by visitors." />
      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b p-3">
          {["all", "pending", "approved", "hidden", "reported"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-secondary" : "text-muted-foreground"}`}>{f}</button>)}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reviews" className="ml-auto rounded-lg border px-3 py-1.5 text-sm outline-none" />
        </div>
        {isLoading ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No reviews here.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">{["User", "Listing", "Rating", "Review", "Date", "Status", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{r.user}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.target_title ?? r.target_type}</td>
                <td className="px-3 py-2">{"★".repeat(r.rating)}</td>
                <td className="max-w-xs px-3 py-2"><p className="line-clamp-2">{r.body}</p></td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmt.date(r.created_at)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.flagged ? "reported" : r.status} /></td>
                <td className="px-3 py-2"><div className="flex gap-1">
                  <button title="Approve" onClick={() => act(r, { status: "approved", flagged: false }, "Approved")} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><Check className="h-4 w-4" /></button>
                  <button title="Hide" onClick={() => act(r, { status: "hidden" }, "Hidden")} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><EyeOff className="h-4 w-4" /></button>
                  <button title="Flag" onClick={() => act(r, { flagged: !r.flagged }, r.flagged ? "Unflagged" : "Flagged")} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><Flag className="h-4 w-4" /></button>
                  <button title="Delete" onClick={() => confirm("Delete this review?") && act(r, null, "Deleted")} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </Guard>
  );
}
