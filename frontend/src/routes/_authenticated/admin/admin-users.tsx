import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdmin } from "@/components/admin/context";
import { db, fmt, type Row } from "@/lib/admin/db";
import { ROLE_LABELS } from "@/lib/admin/sections";
import { createStaff } from "@/lib/admin.functions";

export const path = "/_authenticated/admin/admin-users";
const routeMeta = {
  head: () => ({ meta: [{ title: "Admin Users — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminUsers,
};
export default routeMeta;


const ROLES = Object.keys(ROLE_LABELS);

function AdminUsers() {
  const qc = useQueryClient();
  const { userId } = useAdmin();
  const create = createStaff;
  const [form, setForm] = useState<Row | null>(null);
  const [adding, setAdding] = useState<{ email: string; role: string }>({ email: "", role: "content_admin" });
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data: roles } = await db.from("user_roles").select("user_id,role,created_at").neq("role", "user");
      const ids = [...new Set((roles ?? []).map((r: Row) => r.user_id))];
      const { data: profiles } = ids.length ? await db.from("profiles").select("id,full_name,email,status").in("id", ids) : { data: [] };
      return (profiles ?? []).map((p: Row) => ({ ...p, roles: (roles ?? []).filter((r: Row) => r.user_id === p.id) }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-staff"] });
  const removeRole = async (uid: string, role: string) => {
    if (uid === userId && role === "master_admin") { toast.error("You can't remove your own Master Admin role"); return; }
    const { error } = await db.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) toast.error(error.message); else refresh();
  };
  const grant = async () => {
    const { data: p } = await db.from("profiles").select("id").eq("email", adding.email.trim().toLowerCase()).maybeSingle();
    if (!p) { toast.error("No account with that email. Create a new staff account instead."); return; }
    const { error } = await db.from("user_roles").insert({ user_id: p.id, role: adding.role });
    if (error) toast.error(error.message.includes("duplicate") ? "They already have that role" : error.message); else { toast.success("Role granted"); setAdding({ ...adding, email: "" }); refresh(); }
  };
  const submit = async () => {
    try { await create({ data: { email: form!.email, password: form!.password, name: form!.name ?? "", role: form!.role } }); toast.success("Staff account created"); setForm(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not create account"); }
  };
  return (
    <Guard section="admin-users">
      <PageHeader title="Admin Users" sub="Staff who can sign in to this admin area." actions={<><Button variant="outline" asChild><Link to="/admin/roles">View permissions</Link></Button><Button onClick={() => setForm({ role: "content_admin" })}><Plus className="h-4 w-4" />Create staff account</Button></>} />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <span className="text-sm font-semibold">Give an existing user a role:</span>
        <Input placeholder="their@email.com" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} className="max-w-xs" />
        <select value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
        <Button size="sm" onClick={grant} disabled={!adding.email}>Grant</Button>
      </div>
      <div className="rounded-2xl border bg-card">
        {isLoading ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No staff yet.</Empty> : data.map((s: Row) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{(s.full_name || s.email).charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{s.full_name || s.email} {s.id === userId && <span className="text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{s.email} · since {fmt.date(s.roles[0]?.created_at)}</p></div>
            <div className="flex flex-wrap gap-1.5">{s.roles.map((r: Row) => (
              <span key={r.role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{ROLE_LABELS[r.role]}<button aria-label="Remove role" onClick={() => removeRole(s.id, r.role)}><X className="h-3 w-3" /></button></span>
            ))}</div>
          </div>
        ))}
      </div>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create staff account</DialogTitle></DialogHeader>
          {form && <div className="space-y-3">
            <Input placeholder="Full name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="email" placeholder="Email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input type="text" placeholder="Temporary password (min 8 characters)" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
