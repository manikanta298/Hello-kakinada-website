import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty, Kpi } from "@/components/admin/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db, fmt, type Row } from "@/lib/admin/db";
import { ROLE_LABELS } from "@/lib/admin/sections";
import { deleteUser } from "@/lib/admin.functions";

export const path = "/_authenticated/admin/users";
const routeMeta = {
  head: () => ({ meta: [{ title: "Users — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Users,
};
export default routeMeta;


const PAGE = 25;

function Users() {
  const qc = useQueryClient();
  const del = deleteUser;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<Row | null>(null);
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("q"); if (s) setQ(s); }, []);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-list", q, page],
    queryFn: async () => {
      let query = db.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
      const { data: rows, count } = await query;
      const ids = (rows ?? []).map((r: Row) => r.id);
      const { data: roles } = ids.length ? await db.from("user_roles").select("user_id,role").in("user_id", ids) : { data: [] };
      return { count: count ?? 0, rows: (rows ?? []).map((r: Row) => ({ ...r, roles: (roles ?? []).filter((x: Row) => x.user_id === r.id && x.role !== "user").map((x: Row) => x.role) })) };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users-list"] });
  const setStatus = async (u: Row, status: string) => {
    const { error } = await db.from("profiles").update({ status }).eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success(status === "suspended" ? "User suspended" : "User activated"); refresh(); }
  };
  const remove = async (u: Row) => {
    if (!confirm(`Delete ${u.email}? This permanently removes the account.`)) return;
    try { await del({ data: { userId: u.id } }); toast.success("User deleted"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));
  return (
    <Guard section="users">
      <PageHeader title="Users" sub="Everyone who has signed up on HelloKakinada.in." />
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-3"><Input placeholder="Search by name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="max-w-sm" /></div>
        {isLoading ? <Empty>Loading…</Empty> : !data?.rows.length ? <Empty>No users found.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">{["Name", "Email", "Phone", "Role", "Joined", "Status", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.rows.map((u: Row) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2"><button onClick={() => setViewing(u)} className="font-semibold hover:text-primary">{u.full_name || "—"}</button></td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.phone || "—"}</td>
                <td className="px-3 py-2">{u.roles.length ? u.roles.map((r: string) => ROLE_LABELS[r]).join(", ") : "User"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmt.date(u.created_at)}</td>
                <td className="px-3 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-2">
                  <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Actions" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewing(u)}>View user</DropdownMenuItem>
                      {u.status === "suspended" ? <DropdownMenuItem onClick={() => setStatus(u, "active")}>Activate</DropdownMenuItem> : <DropdownMenuItem onClick={() => setStatus(u, "suspended")}>Suspend</DropdownMenuItem>}
                      <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => remove(u)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>))}</tbody>
          </table></div>
        )}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground"><span>{data?.count ?? 0} users</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>Page {page + 1} of {pages}<Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      </div>
      <Sheet open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">{viewing && <UserProfile user={viewing} onSave={refresh} />}</SheetContent>
      </Sheet>
    </Guard>
  );
}

function UserProfile({ user, onSave }: { user: Row; onSave: () => void }) {
  const [name, setName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const { data } = useQuery({
    queryKey: ["admin-user-detail", user.id],
    queryFn: async () => {
      const tables = ["businesses", "jobs", "properties", "events", "food_places", "services"];
      const listings = (await Promise.all(tables.map(async (t) => (await db.from(t).select("id", { count: "exact", head: true }).eq("created_by", user.id)).count ?? 0))).reduce((a, b) => a + b, 0);
      const { data: reviews, count: reviewCount } = await db.from("reviews").select("id,body,target_title,rating,created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
      const reports = (await db.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", user.id)).count ?? 0;
      const { data: acts, count: likes } = await db.from("media_interactions").select("kind,entity_type,created_at", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(8);
      return { listings, reviews: reviews ?? [], reviewCount: reviewCount ?? 0, reports, acts: acts ?? [], likes: (acts ?? []).filter((a: Row) => a.kind === "like").length, activity: likes ?? 0 };
    },
  });
  const save = async () => {
    const { error } = await db.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); onSave(); }
  };
  return (
    <>
      <SheetHeader><SheetTitle>{user.full_name || user.email}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Listings" value={data?.listings ?? "…"} /><Kpi label="Reviews" value={data?.reviewCount ?? "…"} />
          <Kpi label="Likes" value={data?.likes ?? "…"} /><Kpi label="Reports filed" value={data?.reports ?? "…"} />
        </div>
        <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">Edit</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <Button size="sm" onClick={save}>Save changes</Button></div>
        <div><p className="mb-2 text-xs font-semibold text-muted-foreground">Recent reviews</p>{data?.reviews.length ? data.reviews.map((r: Row) => <p key={r.id} className="border-b py-2 text-sm">{"★".repeat(r.rating)} {r.body} <span className="text-xs text-muted-foreground">— {r.target_title}</span></p>) : <p className="text-sm text-muted-foreground">None</p>}</div>
        <div><p className="mb-2 text-xs font-semibold text-muted-foreground">Activity</p>{data?.acts.length ? data.acts.map((a: Row, i: number) => <p key={i} className="py-1 text-sm capitalize">{a.kind}d a {a.entity_type.replace(/s$/, "").replace("_place", " place")} · <span className="text-muted-foreground">{fmt.ago(a.created_at)}</span></p>) : <p className="text-sm text-muted-foreground">No activity yet</p>}</div>
        <p className="text-xs text-muted-foreground">Saved items will appear here once visitors can save listings.</p>
      </div>
    </>
  );
}
