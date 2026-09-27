import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Send, EyeOff, Star, Upload, Loader2, BarChart3, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Guard, Kpi, PageHeader, StatusBadge } from "./ui";
import { ContentForm, flatten } from "./content-form";
import { STATUSES, type SectionConfig } from "@/lib/admin/sections";
import { db, fmt, uploadMedia, type Row } from "@/lib/admin/db";

const PAGE = 20;

function useCategories(config: SectionConfig) {
  const { data } = useQuery({
    queryKey: ["categories", "explore"],
    enabled: config.key === "videos" || config.key === "photos",
    queryFn: async () => (await db.from("categories").select("name").eq("enabled", true).order("display_order")).data ?? [],
  });
  return data?.length ? data.map((c: Row) => c.name as string) : config.categories;
}

export function ContentManager({ config, extraStats }: { config: SectionConfig; extraStats?: (counts: Record<string, number>) => { label: string; value: number | string }[] }) {
  const qc = useQueryClient();
  const categories = useCategories(config);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);
  useEffect(() => setPage(0), [status, q]);
  useEffect(() => setSelected(new Set()), [status, q, page]);

  const listKey = ["content", config.table, status, q, page];
  const list = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      let query = db.from(config.table).select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (status === "featured") query = query.eq("featured", true);
      else if (status !== "all") query = query.eq("status", status);
      if (q.trim()) query = query.ilike("title", `%${q.trim().replace(/[%_]/g, "")}%`);
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  const counts = useQuery({
    queryKey: ["content-counts", config.table],
    queryFn: async () => {
      const out: Row = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = async (key: string, f?: (x: any) => any) => {
        let query = db.from(config.table).select("id", { count: "exact", head: true });
        if (f) query = f(query);
        out[key] = (await query).count ?? 0;
      };
      await Promise.all([
        c("all"),
        ...STATUSES.map((s) => c(s, (x) => x.eq("status", s))),
        c("featured", (x) => x.eq("featured", true)),
      ]);
      const { data } = await db.from(config.table).select("views,likes,shares").limit(5000);
      out.views = (data ?? []).reduce((a: number, r: Row) => a + (r.views ?? 0), 0);
      out.likes = (data ?? []).reduce((a: number, r: Row) => a + (r.likes ?? 0), 0);
      return out;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["content", config.table] });
    qc.invalidateQueries({ queryKey: ["content-counts", config.table] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const update = async (row: Row, patch: Row, msg: string) => {
    if (patch.status === "published" && !row.published_at) patch.published_at = new Date().toISOString();
    const { error } = await db.from(config.table).update(patch).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await db.from(config.table).delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) toast.error(error.message); else { toast.success(`${config.singular} deleted`); refresh(); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkDeleting(true);
    const { error, count } = await db.from(config.table).delete({ count: "exact" }).in("id", ids);
    setBulkDeleting(false);
    setConfirmBulk(false);
    if (error) { toast.error(error.message); return; }
    setSelected(new Set());
    if ((count ?? ids.length) < ids.length) toast.warning(`${count} of ${ids.length} deleted — you may not have permission for the rest`);
    else toast.success(`${ids.length} ${ids.length === 1 ? config.singular.toLowerCase() : config.title.toLowerCase()} deleted`);
    const remaining = (list.data?.count ?? 0) - (count ?? ids.length);
    if (page > 0 && page * PAGE >= remaining) setPage(page - 1);
    refresh();
  };

  const bulk = async (files: FileList | null) => {
    if (!files?.length) return;
    setBulkBusy(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        const url = await uploadMedia(f, config.table);
        const { error } = await db.from(config.table).insert({ title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), image_url: url, status: "draft" });
        if (!error) ok++;
      } catch { /* continue with the rest */ }
    }
    setBulkBusy(false);
    toast.success(`${ok} of ${files.length} photos uploaded as drafts`);
    refresh();
  };

  const c: Row = counts.data ?? {};
  const stats = extraStats ? extraStats(c) : [
    { label: `Total ${config.title}`, value: c.all ?? 0 },
    { label: "Published", value: c.published ?? 0 },
    { label: "Pending", value: c.pending ?? 0 },
    { label: "Drafts", value: c.draft ?? 0 },
    { label: "Featured", value: c.featured ?? 0 },
  ];
  const totalPages = Math.max(1, Math.ceil((list.data?.count ?? 0) / PAGE));
  const tabs = useMemo(() => ["all", "published", "pending", "draft", "archived", "featured"], []);
  const analyticsLink = config.key === "videos" ? "/admin/explore/videos/analytics" : config.key === "photos" ? "/admin/explore/photos/analytics" : null;

  return (
    <Guard section={config.permission}>
      <PageHeader title={config.title} sub={config.description} actions={<>
        {analyticsLink && <Button variant="outline" asChild><Link to={analyticsLink}><BarChart3 className="h-4 w-4" />Analytics</Link></Button>}
        {config.bulkUpload && (
          <Button variant="outline" asChild>
            <label className="cursor-pointer">{bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload multiple<input type="file" accept="image/*" multiple className="hidden" disabled={bulkBusy} onChange={(e) => bulk(e.target.files)} /></label>
          </Button>
        )}
        <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Add {config.singular}</Button>
      </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => <Kpi key={s.label} label={s.label} value={typeof s.value === "number" ? fmt.number(s.value) : s.value} />)}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button key={t} onClick={() => setStatus(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${status === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t} <span className="text-muted-foreground">{c[t] ?? ""}</span>
              </button>
            ))}
          </div>
          <label className="ml-auto flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 sm:w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b bg-secondary/50 px-3 py-2 text-sm">
            <span className="font-semibold">{selected.size} selected</span>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            <Button size="sm" variant="destructive" className="ml-auto" disabled={!selected.size} onClick={() => setConfirmBulk(true)}><Trash2 className="h-4 w-4" />Delete selected</Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 accent-[var(--primary)]"
                  checked={!!list.data?.rows.length && list.data.rows.every((r) => selected.has(r.id))}
                  ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !list.data?.rows.every((r) => selected.has(r.id)); }}
                  onChange={(e) => setSelected(e.target.checked ? new Set(list.data?.rows.map((r) => r.id as string)) : new Set())} /></th>
                <th className="px-3 py-2.5 font-medium">{config.singular}</th>
                {config.columns.map((col) => <th key={col.key} className="whitespace-nowrap px-3 py-2.5 font-medium">{col.label}</th>)}
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <tr><td colSpan={config.columns.length + 4} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {list.error && <tr><td colSpan={config.columns.length + 4} className="py-10 text-center text-destructive">{(list.error as Error).message}</td></tr>}
              {list.data?.rows.length === 0 && <tr><td colSpan={config.columns.length + 4} className="py-12 text-center text-muted-foreground">No {config.title.toLowerCase()} yet. <button className="font-semibold text-primary" onClick={() => setEditing(null)}>Add the first one</button></td></tr>}
              {list.data?.rows.map((row) => {
                const flat = flatten(row);
                return (
                  <tr key={row.id} className={`border-b last:border-0 hover:bg-secondary/40 ${selected.has(row.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${row.title}`} className="h-4 w-4 accent-[var(--primary)]" checked={selected.has(row.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(row.id); else n.delete(row.id); return n; })} /></td>
                    <td className="px-3 py-2">
                      <button onClick={() => setViewing(row)} className="flex items-center gap-3 text-left">
                        {row.image_url ? <img src={row.image_url} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded-md object-cover" /> : <span className="grid h-10 w-14 shrink-0 place-items-center rounded-md bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></span>}
                        <span className="min-w-0"><span className="block max-w-[240px] truncate font-semibold">{row.title}</span>{row.featured && <span className="text-[11px] font-semibold text-accent-foreground">★ Featured</span>}{row.verified && <span className="ml-1 text-[11px] font-semibold text-primary">✓ Verified</span>}</span>
                      </button>
                    </td>
                    {config.columns.map((col) => (
                      <td key={col.key} className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {col.format === "number" ? fmt.number(flat[col.key] ?? 0) : col.format === "date" ? fmt.date(flat[col.key]) : col.format === "money" ? fmt.money(flat[col.key]) : col.format === "rating" ? (flat[col.key] ? `${flat[col.key]} ★` : "—") : (flat[col.key] || "—")}
                      </td>
                    ))}
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button aria-label="Actions" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(row)}><Eye className="h-4 w-4" />View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(row)}><Pencil className="h-4 w-4" />Edit</DropdownMenuItem>
                          {row.status !== "published" ? <DropdownMenuItem onClick={() => update(row, { status: "published" }, "Published")}><Send className="h-4 w-4" />Publish</DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => update(row, { status: "draft" }, "Unpublished")}><EyeOff className="h-4 w-4" />Unpublish</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => update(row, { featured: !row.featured }, row.featured ? "Removed from featured" : "Marked as featured")}><Star className="h-4 w-4" />{row.featured ? "Unfeature" : "Feature"}</DropdownMenuItem>
                          {row.status !== "archived" && <DropdownMenuItem onClick={() => update(row, { status: "archived" }, "Archived")}>Archive</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>{list.data?.count ?? 0} total</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="grid h-7 w-7 place-items-center rounded-md border disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            Page {page + 1} of {totalPages}
            <button disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="grid h-7 w-7 place-items-center rounded-md border disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {editing !== undefined && <ContentForm key={editing?.id ?? "new"} config={config} row={editing} categories={categories} open onOpenChange={(v) => !v && setEditing(undefined)} onSaved={refresh} />}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.title}</DialogTitle></DialogHeader>
          {viewing && (() => {
            const flat = flatten(viewing);
            return (
              <div className="space-y-4">
                {viewing.media_url ? <video src={viewing.media_url} poster={viewing.image_url ?? undefined} controls className="w-full rounded-xl bg-muted" /> : viewing.image_url && <img src={viewing.image_url} alt="" className="w-full rounded-xl object-cover" />}
                <div className="flex flex-wrap gap-2 text-xs"><StatusBadge status={viewing.status} /><span className="rounded-full bg-secondary px-2 py-0.5">👁 {fmt.number(viewing.views)}</span><span className="rounded-full bg-secondary px-2 py-0.5">❤️ {fmt.number(viewing.likes)}</span><span className="rounded-full bg-secondary px-2 py-0.5">↗ {fmt.number(viewing.shares)}</span></div>
                {viewing.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{viewing.description}</p>}
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {config.fields.filter((f) => !["title", "description", "image_url", "images", "media_url", "status"].includes(f.type === "image" ? "image_url" : f.key) && f.type !== "image" && f.type !== "images").map((f) => (
                    <div key={f.key}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="font-medium">{Array.isArray(flat[f.key]) ? (flat[f.key] as string[]).join(", ") || "—" : typeof flat[f.key] === "boolean" ? (flat[f.key] ? "Yes" : "No") : String(flat[f.key] ?? "") || "—"}</dd></div>
                  ))}
                </dl>
                {viewing.images?.length > 0 && <div className="grid grid-cols-4 gap-2">{viewing.images.map((u: string) => <img key={u} src={u} alt="" className="aspect-square rounded-lg object-cover" />)}</div>}
                <div className="flex gap-2"><Button onClick={() => { setEditing(viewing); setViewing(null); }}><Pencil className="h-4 w-4" />Edit</Button></div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle><AlertDialogDescription>This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmBulk} onOpenChange={(v) => !bulkDeleting && setConfirmBulk(v)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure you want to permanently delete {selected.size} {selected.size === 1 ? config.singular.toLowerCase() : config.title.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>Only the {selected.size} selected rows will be removed. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={bulkDeleting} onClick={(e) => { e.preventDefault(); bulkDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Delete {selected.size}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Guard>
  );
}
