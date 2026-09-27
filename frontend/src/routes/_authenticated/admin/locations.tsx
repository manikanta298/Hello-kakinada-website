import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Guard, PageHeader } from "@/components/admin/ui";
import { db, uploadMedia, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/locations";
const routeMeta = {
  head: () => ({ meta: [{ title: "Locations — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: LocationsAdmin,
};
export default routeMeta;


const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RESERVED = ["admin", "auth", "jobs", "properties", "businesses", "restaurants", "services", "events", "explore", "search", "locations", "about", "account", "dashboard", "api", "best-hotels-in-kakinada"];
const esc = (s: string) => s.replace(/[,()%*\\"']/g, " ").trim();

function LocationsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: async () => {
      const { data, error } = await db.from("locations").select("*").order("display_order");
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const counts = await Promise.all(rows.map(async (l) => {
        const al = ((l.aliases?.length ? l.aliases : [l.name]) as string[]).map(esc).filter(Boolean);
        const or = al.flatMap((a) => [`location.ilike.%${a}%`, `details->>address.ilike.%${a}%`]).join(",");
        const n = await Promise.all(["businesses", "jobs", "properties", "food_places", "services", "events"].map(async (t) => (await db.from(t).select("id", { count: "exact", head: true }).or(or)).count ?? 0));
        return n.reduce((a, b) => a + b, 0);
      }));
      return rows.map((r, i) => ({ ...r, count: counts[i] }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-locations"] });
  const patch = async (row: Row, p: Row) => { const { error } = await db.from("locations").update(p).eq("id", row.id); if (error) toast.error(error.message); else refresh(); };
  const remove = async (row: Row) => {
    if (!confirm(`Delete the ${row.name} location page? Listings are not affected.`)) return;
    const { error } = await db.from("locations").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Location deleted"); refresh(); }
  };

  return (
    <Guard section="categories">
      <PageHeader title="Locations" sub="Towns and areas with their own page on the website, e.g. hellokakinada.in/tuni. Listings are matched by their location or address." actions={<Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Add location</Button>} />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Page</th><th className="px-3 py-2.5">Listings</th><th className="px-3 py-2.5">Enabled</th><th className="px-3 py-2.5">Featured</th><th className="w-24" /></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {data?.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No locations yet.</td></tr>}
            {data?.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-3 py-2"><div className="flex items-center gap-3">{l.image_url ? <img src={l.image_url} alt="" className="h-9 w-12 rounded-md object-cover" /> : <span className="h-9 w-12 rounded-md bg-muted" />}<div><p className="font-semibold">{l.name}</p><p className="max-w-xs truncate text-xs text-muted-foreground">{l.seo_title || "No SEO title"}</p></div></div></td>
                <td className="px-3 py-2"><Link to={`/${l.slug}`} target="_blank" className="inline-flex items-center gap-1 text-primary">/{l.slug}<ExternalLink className="h-3 w-3" /></Link></td>
                <td className="px-3 py-2">{l.count}</td>
                <td className="px-3 py-2"><input type="checkbox" aria-label="Enabled" checked={l.enabled} onChange={(e) => patch(l, { enabled: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2"><input type="checkbox" aria-label="Featured" checked={l.featured} onChange={(e) => patch(l, { featured: e.target.checked })} className="h-4 w-4" /></td>
                <td className="px-3 py-2"><div className="flex gap-1"><button aria-label="Edit" onClick={() => setEditing(l)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><Pencil className="h-4 w-4" /></button><button aria-label="Delete" onClick={() => remove(l)} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <LocationForm key={editing?.id ?? "new"} row={editing} nextOrder={(data?.length ?? 0) + 1} onClose={() => setEditing(undefined)} onSaved={refresh} />}
    </Guard>
  );
}

function LocationForm({ row, nextOrder, onClose, onSaved }: { row: Row | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Row>(() => ({
    name: row?.name ?? "", slug: row?.slug ?? "", aliases: (row?.aliases ?? []).join(", "), nearby: (row?.nearby ?? []).join(", "),
    description: row?.description ?? "", seo_title: row?.seo_title ?? "", seo_description: row?.seo_description ?? "", image_url: row?.image_url ?? "",
    enabled: row?.enabled ?? true, featured: row?.featured ?? false, display_order: row?.display_order ?? nextOrder,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((p: Row) => ({ ...p, [k]: v }));
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    const slug = slugify(f.slug || f.name);
    if (!f.name.trim() || !slug) { toast.error("Name is required"); return; }
    if (RESERVED.includes(slug)) { toast.error(`"/${slug}" is already used by another page — pick a different web address`); return; }
    setBusy(true);
    const payload = { ...f, name: f.name.trim(), slug, aliases: list(f.aliases).length ? list(f.aliases) : [f.name.trim()], nearby: list(f.nearby), image_url: f.image_url || null, display_order: Number(f.display_order) || 0 };
    const { error } = row ? await db.from("locations").update(payload).eq("id", row.id) : await db.from("locations").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That web address is already used" : error.message); return; }
    toast.success("Location saved"); onSaved(); onClose();
  };
  const inp = "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? `Edit ${row.name}` : "Add location"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Name<input className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label>Web address<input className={inp} value={f.slug} placeholder={slugify(f.name)} onChange={(e) => set("slug", e.target.value)} /></label>
          </div>
          <label>Other spellings used in addresses (comma separated)<input className={inp} value={f.aliases} placeholder="Samalkota, Samalkot" onChange={(e) => set("aliases", e.target.value)} /></label>
          <label>Page description<textarea rows={3} className={inp} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label>SEO title<input className={inp} value={f.seo_title} onChange={(e) => set("seo_title", e.target.value)} /><span className="text-xs text-muted-foreground">{f.seo_title.length}/60</span></label>
          <label>SEO description<textarea rows={2} className={inp} value={f.seo_description} onChange={(e) => set("seo_description", e.target.value)} /><span className="text-xs text-muted-foreground">{f.seo_description.length}/160</span></label>
          <label>Nearby areas (comma separated)<input className={inp} value={f.nearby} onChange={(e) => set("nearby", e.target.value)} /></label>
          <div>Image
            <div className="mt-1 flex items-center gap-3">
              {f.image_url && <img src={f.image_url} alt="" className="h-14 w-20 rounded-md object-cover" />}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2"><Upload className="h-4 w-4" />Upload<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { set("image_url", await uploadMedia(file, "locations")); } catch (err) { toast.error((err as Error).message); } }} /></label>
              {f.image_url && <button className="text-xs text-destructive" onClick={() => set("image_url", "")}>Remove</button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} />Enabled</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} />Featured</label>
            <label className="flex items-center gap-2">Order<input type="number" className="w-20 rounded-lg border bg-background px-2 py-1" value={f.display_order} onChange={(e) => set("display_order", e.target.value)} /></label>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
