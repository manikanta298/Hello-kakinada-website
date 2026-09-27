import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Guard, PageHeader, StatusBadge, Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldInput } from "@/components/admin/content-form";
import { db, fmt, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/notifications";
const routeMeta = {
  head: () => ({ meta: [{ title: "Notifications — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Notifications,
};
export default routeMeta;


const AUDIENCES = ["All Users", "Business Owners", "Job Seekers", "Property Users", "Specific Category"];

function Notifications() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Row | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-notifications"], queryFn: async () => ((await db.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? []) as Row[] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  const save = async (status: string) => {
    if (!form?.title?.trim()) { toast.error("Title is required"); return; }
    const payload = { title: form.title, message: form.message, image_url: form.image_url || null, audience: form.audience, category: form.category || null, scheduled_at: form.scheduled_at || null, status: status === "send" ? (form.scheduled_at ? "scheduled" : "sent") : "draft" };
    const { error } = form.id ? await db.from("notifications").update(payload).eq("id", form.id) : await db.from("notifications").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(payload.status === "draft" ? "Saved as draft" : payload.status === "scheduled" ? "Scheduled" : "Notification published");
    setForm(null); refresh();
  };
  return (
    <Guard section="notifications">
      <PageHeader title="Notifications" sub="Announcements shown to signed-in users." actions={<Button onClick={() => setForm({ audience: "All Users" })}><Plus className="h-4 w-4" />New notification</Button>} />
      <div className="rounded-2xl border bg-card">
        {isLoading ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No notifications yet.</Empty> : data.map((n) => (
          <div key={n.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            {n.image_url && <img src={n.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
            <button className="min-w-0 flex-1 text-left" onClick={() => setForm({ ...n, scheduled_at: n.scheduled_at?.slice(0, 16) ?? "" })}>
              <p className="font-semibold">{n.title}</p><p className="truncate text-xs text-muted-foreground">{n.audience} · {n.scheduled_at ? `Scheduled ${fmt.date(n.scheduled_at)}` : fmt.date(n.created_at)}</p>
            </button>
            <StatusBadge status={n.status} />
            <button aria-label="Delete" onClick={async () => { if (confirm("Delete?")) { await db.from("notifications").delete().eq("id", n.id); refresh(); } }} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit notification" : "New notification"}</DialogTitle></DialogHeader>
          {form && <div className="space-y-3">
            <Input placeholder="Title" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Message" value={form.message ?? ""} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <FieldInput field={{ key: "image_url", label: "Image", type: "image" }} value={form.image_url} set={(v) => setForm({ ...form, image_url: v })} categories={[]} folder="notifications" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm">{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select>
              <Input placeholder="Category (optional)" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <label className="block text-xs font-semibold text-muted-foreground">Schedule (leave empty to publish now)<Input type="datetime-local" className="mt-1" value={form.scheduled_at ?? ""} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => save("draft")}>Save draft</Button><Button onClick={() => save("send")}><Send className="h-4 w-4" />{form?.scheduled_at ? "Schedule" : "Publish now"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
