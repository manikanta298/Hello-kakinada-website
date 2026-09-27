import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, GripVertical, Image, Pencil, Plus, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ContentForm } from "@/components/admin/content-form";
import { SECTIONS } from "@/lib/admin/sections";
import { db, fmt, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/explore/content";
const routeMeta = {
  head: () => ({ meta: [{ title: "Explore Content — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: ExploreContent,
};
export default routeMeta;


type Kind = "videos" | "photos";
type Item = Row & { kind: Kind };
const FILTERS = ["All", "Reels", "Photos", "Published", "Draft"] as const;
const COLS = "id,title,category,location,status,featured,sort_order,created_at,published_at,image_url,media_url";

function ExploreContent() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [editing, setEditing] = useState<{ kind: Kind; row: Row | null } | null>(null);
  const [order, setOrder] = useState<Item[]>([]);
  const [drag, setDrag] = useState<number | null>(null);

  const { data: cats } = useQuery({ queryKey: ["categories", "explore"], queryFn: async () => (await db.from("categories").select("name").eq("enabled", true).order("display_order")).data ?? [] });
  const categories = cats?.length ? cats.map((c: Row) => c.name as string) : SECTIONS["videos"]!.categories;

  const list = useQuery({
    queryKey: ["explore-content"],
    queryFn: async () => {
      const [v, p] = await Promise.all([db.from("videos").select(COLS), db.from("photos").select(COLS)]);
      if (v.error) throw v.error; if (p.error) throw p.error;
      return [...(v.data as Row[]).map((r) => ({ ...r, kind: "videos" as const })), ...(p.data as Row[]).map((r) => ({ ...r, kind: "photos" as const }))]
        .sort((a, b) => (a.sort_order - b.sort_order) || String(b.published_at ?? b.created_at).localeCompare(String(a.published_at ?? a.created_at)));
    },
  });
  useEffect(() => { if (list.data) setOrder(list.data); }, [list.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["explore-content"] }); qc.invalidateQueries({ queryKey: ["explore-feed"] }); };
  const rows = order.filter((r) => filter === "All" || (filter === "Reels" && r.kind === "videos") || (filter === "Photos" && r.kind === "photos") || (filter === "Published" && r.status === "published") || (filter === "Draft" && r.status === "draft"));
  const canDrag = filter === "All";

  const saveOrder = async (next: Item[]) => {
    setOrder(next);
    const changed = next.map((r, i) => ({ r, i })).filter(({ r, i }) => r.sort_order !== i);
    const results = await Promise.all(changed.map(({ r, i }) => db.from(r.kind).update({ sort_order: i }).eq("id", r.id)));
    const err = results.find((x) => x.error)?.error;
    if (err) toast.error(err.message); else toast.success("Order saved");
    refresh();
  };
  const onDrop = (to: number) => {
    if (drag == null || drag === to) return setDrag(null);
    const next = [...order]; const [m] = next.splice(drag, 1); next.splice(to, 0, m!); setDrag(null); saveOrder(next);
  };

  const update = async (r: Item, patch: Row, msg: string) => {
    const { error } = await db.from(r.kind).update(patch).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  };
  const remove = async (r: Item) => {
    if (!confirm(`Delete "${r.title}"? This can't be undone.`)) return;
    const { error } = await db.from(r.kind).delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <Guard section="videos">
      <PageHeader title="Explore Content" sub="Reels and photos shown in the Explore feed. Drag rows to set the order visitors see."
        actions={<div className="flex gap-2">
          <Button onClick={() => setEditing({ kind: "videos", row: null })}><Plus className="h-4 w-4" />Add Reel</Button>
          <Button variant="outline" onClick={() => setEditing({ kind: "photos", row: null })}><Plus className="h-4 w-4" />Add Photo</Button>
        </div>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{f}</button>)}
      </div>
      {!canDrag && <p className="mb-3 text-xs text-muted-foreground">Switch to "All" to reorder by dragging.</p>}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="w-8 p-3" /><th className="p-3">Thumbnail</th><th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">Category</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Order</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const idx = order.indexOf(r);
              return (
                <tr key={`${r.kind}-${r.id}`} draggable={canDrag} onDragStart={() => setDrag(idx)} onDragOver={(e) => canDrag && e.preventDefault()} onDrop={() => onDrop(idx)}
                  className={`border-b last:border-0 ${drag === idx ? "opacity-40" : ""}`}>
                  <td className="p-3 text-muted-foreground">{canDrag && <GripVertical className="h-4 w-4 cursor-grab" />}</td>
                  <td className="p-3"><div className="h-14 w-10 overflow-hidden rounded-md bg-muted">{r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" /> : r.media_url ? <video src={r.media_url} preload="metadata" muted className="h-full w-full object-cover" /> : null}</div></td>
                  <td className="max-w-[220px] p-3 font-semibold"><span className="line-clamp-2">{r.featured && <Star className="mr-1 inline h-3.5 w-3.5 fill-accent text-accent" />}{r.title}</span></td>
                  <td className="p-3"><span className="inline-flex items-center gap-1 text-xs font-medium">{r.kind === "videos" ? <><Clapperboard className="h-3.5 w-3.5" />Reel</> : <><Image className="h-3.5 w-3.5" />Photo</>}</span></td>
                  <td className="p-3">{r.category ?? "—"}</td>
                  <td className="p-3">{r.location ?? "—"}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 tabular-nums">{idx + 1}</td>
                  <td className="p-3 text-muted-foreground">{fmt.date(r.created_at)}</td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title={r.status === "published" ? "Unpublish" : "Publish"} onClick={() => update(r, r.status === "published" ? { status: "draft" } : { status: "published", published_at: r.published_at ?? new Date().toISOString() }, r.status === "published" ? "Unpublished" : "Published")}>{r.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    <Button size="icon" variant="ghost" title="Feature" onClick={() => update(r, { featured: !r.featured }, r.featured ? "Unfeatured" : "Featured")}><Star className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={async () => { const { data } = await db.from(r.kind).select("*").eq("id", r.id).single(); setEditing({ kind: r.kind, row: data as Row }); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.isLoading ? <Empty>Loading…</Empty> : rows.length === 0 && <Empty>No content here yet. Add a reel or photo to get started.</Empty>}
      </div>

      {editing && <ContentForm key={editing.row?.id ?? `new-${editing.kind}`} config={SECTIONS[editing.kind]!} row={editing.row} categories={categories} open onOpenChange={(v) => !v && setEditing(null)} onSaved={refresh} />}
    </Guard>
  );
}
