import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Guard, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/admin/content-form";
import type { Field } from "@/lib/admin/sections";
import { db, type Row } from "@/lib/admin/db";

export const path = "/_authenticated/admin/settings";
const routeMeta = {
  head: () => ({ meta: [{ title: "Settings — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: Settings,
};
export default routeMeta;


const SECTIONS: { key: string; label: string; fields?: Field[]; link?: string }[] = [
  { key: "general", label: "General", fields: [{ key: "site_name", label: "Site name", type: "text" }, { key: "tagline", label: "Tagline", type: "text" }, { key: "contact_email", label: "Contact email", type: "text" }, { key: "contact_phone", label: "Contact phone", type: "text" }, { key: "address", label: "Address", type: "textarea" }] },
  { key: "branding", label: "Branding", fields: [{ key: "logo_url", label: "Logo", type: "image" }, { key: "favicon_url", label: "Favicon", type: "image" }, { key: "og_image", label: "Social share image", type: "image" }] },
  { key: "homepage", label: "Homepage", fields: [{ key: "hero_title", label: "Hero title", type: "text" }, { key: "hero_subtitle", label: "Hero subtitle", type: "text" }, { key: "show_featured", label: "Show featured listings", type: "switch" }, { key: "announcement", label: "Announcement bar text", type: "text" }] },
  { key: "explore", label: "Explore", fields: [{ key: "videos_title", label: "Videos heading", type: "text" }, { key: "videos_subtitle", label: "Videos subtitle", type: "text" }, { key: "photos_title", label: "Photos heading", type: "text" }, { key: "autoplay", label: "Autoplay videos in player", type: "switch" }] },
  { key: "categories", label: "Categories", link: "/admin/explore/categories" },
  { key: "seo", label: "SEO", fields: [{ key: "meta_title", label: "Default page title", type: "text" }, { key: "meta_description", label: "Default description", type: "textarea" }, { key: "keywords", label: "Keywords", type: "tags" }] },
  { key: "notifications", label: "Notifications", fields: [{ key: "email_new_listing", label: "Email me on new listings", type: "switch" }, { key: "email_new_report", label: "Email me on new reports", type: "switch" }, { key: "admin_email", label: "Admin email", type: "text" }] },
  { key: "security", label: "Security", fields: [{ key: "require_listing_approval", label: "New listings need approval", type: "switch" }, { key: "require_review_approval", label: "Reviews need approval", type: "switch" }] },
  { key: "admin-users", label: "Admin Users", link: "/admin/admin-users" },
  { key: "roles", label: "Roles", link: "/admin/roles" },
  { key: "social", label: "Social Links", fields: [{ key: "facebook", label: "Facebook", type: "url" }, { key: "instagram", label: "Instagram", type: "url" }, { key: "youtube", label: "YouTube", type: "url" }, { key: "x", label: "X / Twitter", type: "url" }, { key: "whatsapp", label: "WhatsApp number", type: "text" }] },
];

function Settings() {
  const qc = useQueryClient();
  const [active, setActive] = useState("general");
  const section = SECTIONS.find((s) => s.key === active)!;
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: async () => Object.fromEntries(((await db.from("site_settings").select("*")).data ?? []).map((r: Row) => [r.key, r.value])) as Row });
  const [values, setValues] = useState<Row>({});
  useEffect(() => setValues(data?.[active] ?? {}), [data, active]);
  const save = async () => {
    const { error } = await db.from("site_settings").upsert({ key: active, value: values, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
  };
  return (
    <Guard section="settings">
      <PageHeader title="Settings" sub="Site-wide options for HelloKakinada.in." />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-2 md:flex-col">
          {SECTIONS.map((s) => <button key={s.key} onClick={() => setActive(s.key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium ${active === s.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>{s.label}</button>)}
        </nav>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-bold">{section.label}</h2>
          {section.link ? (
            <p className="text-sm text-muted-foreground">Managed on its own page. <Link to={section.link} className="font-semibold text-primary">Open {section.label} →</Link></p>
          ) : (
            <div className="grid max-w-2xl gap-4">
              {section.fields!.map((f) => (
                <div key={f.key}><label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{f.label}</label>
                  <FieldInput field={f} value={values[f.key]} set={(v) => setValues((s: Row) => ({ ...s, [f.key]: v }))} categories={[]} folder="settings" /></div>
              ))}
              <div><Button onClick={save}>Save {section.label}</Button></div>
            </div>
          )}
        </div>
      </div>
    </Guard>
  );
}
