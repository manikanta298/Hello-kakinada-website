import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldInput } from "@/components/admin/content-form";
import { db, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/explore/categories";
const routeMeta = {
  head: () => ({ meta: [{ title: "Categories — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Categories,
};
export default routeMeta;


function Categories() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => ((await db.from("categories").select("*").order("display_order")).data ?? []) as Row[] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    const { id, created_at: _c, updated_at: _u, ...rest } = editing;
    const payload = { ...rest, display_order: id ? rest.display_order : data.length + 1 };
    const { error } = id ? await db.from("categories").update(payload).eq("id", id) : await db.from("categories").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Category saved"); setEditing(null); refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = data[i], b = data[i + dir];
    if (!a || !b) return;
    await Promise.all([db.from("categories").update({ display_order: b.display_order }).eq("id", a.id), db.from("categories").update({ display_order: a.display_order }).eq("id", b.id)]);
    refresh();
  };
  const toggle = async (c: Row) => { await db.from("categories").update({ enabled: !c.enabled }).eq("id", c.id); refresh(); };
  const remove = async (c: Row) => { if (!confirm(`Delete ${c.name}?`)) return; const { error } = await db.from("categories").delete().eq("id", c.id); if (error) toast.error(error.message); else refresh(); };

  return (
    <Guard section="categories">
      <PageHeader title="Explore Categories" sub="Categories used for videos and photos. Drag order with the arrows." actions={<Button onClick={() => setEditing({ name: "", icon: "", description: "", image_url: "", enabled: true })}><Plus className="h-4 w-4" />Add category</Button>} />
      <div className="rounded-2xl border bg-card">
        {isLoading ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No categories yet.</Empty> : data.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            <div className="flex flex-col"><button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button aria-label="Move down" disabled={i === data.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div>
            {c.image_url ? <img src={c.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-xs font-bold">{c.name.charAt(0)}</span>}
            <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.description || (c.icon ? `Icon: ${c.icon}` : "No description")}</p></div>
            <StatusBadge status={c.enabled ? "active" : "hidden"} />
            <Switch checked={c.enabled} onCheckedChange={() => toggle(c)} aria-label="Enable" />
            <button aria-label="Edit" onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
            <button aria-label="Delete" onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit category" : "Add category"}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <Input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Icon name (e.g. Waves)" value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
            <Textarea placeholder="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <FieldInput field={{ key: "image_url", label: "Image", type: "image" }} value={editing.image_url} set={(v) => setEditing({ ...editing, image_url: v })} categories={[]} folder="categories" />
            <label className="flex items-center gap-2 text-sm"><Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />Enabled</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
