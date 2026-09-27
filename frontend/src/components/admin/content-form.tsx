import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CORE_KEYS, type Field, type SectionConfig } from "@/lib/admin/sections";
import { db, uploadMedia, type Row } from "@/lib/admin/db";

export function flatten(row: Row | null): Row {
  if (!row) return { status: "draft", featured: false, verified: false, tags: [], images: [] };
  const { details, ...rest } = row;
  return { ...rest, ...(details ?? {}), published_at: row.published_at ? String(row.published_at).slice(0, 10) : "" };
}

function split(values: Row, fields: Field[]) {
  const core: Row = {};
  const details: Row = {};
  for (const f of fields) {
    let v = values[f.key];
    if (f.type === "number") v = v === "" || v == null ? null : Number(v);
    if (f.type === "date" && !v) v = null;
    if (CORE_KEYS.has(f.key)) core[f.key] = v; else details[f.key] = v;
  }
  return { core, details };
}

function MediaInput({ value, onChange, folder, accept, multiple }: { value: string | string[] | undefined; onChange: (v: string | string[]) => void; folder: string; accept: string; multiple?: boolean }) {
  const [busy, setBusy] = useState(false);
  const list = multiple ? ((value as string[]) ?? []) : value ? [value as string] : [];
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadMedia(f, folder)));
      onChange(multiple ? [...list, ...urls] : urls[0]!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      {list.length > 0 && (
        <div className={accept.startsWith("video") ? "flex flex-wrap gap-2" : "grid grid-cols-3 gap-2 sm:grid-cols-4"}>
          {list.map((u) => (
            <div key={u} className="relative">
              {accept.startsWith("video") ? <video src={u} className="h-24 w-40 rounded-lg bg-muted object-cover" controls /> : <Thumb src={u} />}
              <button type="button" aria-label="Remove" onClick={() => onChange(multiple ? list.filter((x) => x !== u) : "")} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : list.length && !multiple ? "Replace file" : multiple ? "Add files" : "Upload file"}
        <input type="file" accept={accept} multiple={multiple} className="hidden" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
    </div>
  );
}

function Thumb({ src }: { src: string }) {
  const [bad, setBad] = useState(false);
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded-lg bg-muted">
      {bad ? <span className="grid h-full place-items-center p-1 text-center text-[11px] text-muted-foreground">Image unavailable</span>
        : <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className="h-full w-full object-cover" />}
    </a>
  );
}

function ImageUrlInput({ value, onChange, folder }: { value: string | undefined; onChange: (v: string) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const url = value ?? "";
  const valid = /^https?:\/\/\S+$/i.test(url.trim());
  const onFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast.error("Please choose a JPG, PNG or WEBP image"); return; }
    setBusy(true);
    try { onChange(await uploadMedia(f, folder)); setBad(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      {valid && (
        <div className="flex items-start gap-3">
          <div className="aspect-[4/3] w-40 overflow-hidden rounded-lg bg-muted">
            {bad ? <span className="grid h-full place-items-center p-1 text-center text-[11px] text-muted-foreground">Image unavailable</span>
              : <img key={url} src={url} alt="Job image preview" onError={() => setBad(true)} onLoad={() => setBad(false)} className="h-full w-full object-cover" />}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { onChange(""); setBad(false); }}><X className="h-3.5 w-3.5" />Remove image</Button>
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : valid ? "Replace image" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" disabled={busy} onChange={(e) => { onFile(e.target.files); e.target.value = ""; }} />
      </label>
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Image URL</span>
        <Input type="url" value={url} onChange={(e) => { onChange(e.target.value); setBad(false); }} placeholder="https://example.com/image.jpg" />
      </div>
    </div>
  );
}

function TagsInput({ value, onChange }: { value: string[] | undefined; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const tags = value ?? [];
  const add = () => { const t = text.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setText(""); };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
      {tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">{t}<button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>)}
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} placeholder="Type and press Enter" className="min-w-24 flex-1 bg-transparent py-1 text-sm outline-none" />
    </div>
  );
}

export function FieldInput({ field, value, set, categories, folder }: { field: Field; value: unknown; set: (v: unknown) => void; categories: string[]; folder: string }) {
  const options = field.key === "category" ? categories : field.options ?? [];
  switch (field.type) {
    case "textarea": return <Textarea rows={4} value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
    case "select": return (
      <select value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm capitalize">
        <option value="">Select…</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    case "switch": return <div className="flex h-9 items-center"><Switch checked={!!value} onCheckedChange={set} /></div>;
    case "tags": return <TagsInput value={value as string[]} onChange={set} />;
    case "image": return <MediaInput value={value as string} onChange={set} folder={folder} accept="image/*" />;
    case "images": return <MediaInput value={value as string[]} onChange={set} folder={folder} accept="image/*" multiple />;
    case "image_url": return <ImageUrlInput value={value as string} onChange={set} folder={folder} />;
    case "video": return <MediaInput value={value as string} onChange={set} folder={folder} accept="video/*" />;
    default: return <Input type={field.type === "url" ? "url" : field.type} value={(value as string | number) ?? ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
  }
}

export function ContentForm({ config, row, categories, open, onOpenChange, onSaved }: { config: SectionConfig; row: Row | null; categories: string[]; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [values, setValues] = useState<Row>(() => flatten(row));
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title?.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const { core, details } = split(values, config.fields);
    const payload: Row = { ...core, details: { ...(row?.details ?? {}), ...details } };
    if (payload.status === "published" && !payload.published_at) payload.published_at = new Date().toISOString();
    const q = row ? db.from(config.table).update(payload).eq("id", row.id) : db.from(config.table).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${config.singular} ${row ? "updated" : "added"}`);
    onSaved();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? `Edit ${config.singular.toLowerCase()}` : `Add ${config.singular.toLowerCase()}`}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((f) => (
            <div key={f.key} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{f.label}{f.required && " *"}</label>
              <FieldInput field={f} value={values[f.key]} set={(v) => setValues((s: Row) => ({ ...s, [f.key]: v }))} categories={categories} folder={config.table} />
            </div>
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
