import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { db, type Row } from "@/lib/admin/db";
import { ENTITY_LABEL, ENTITY_PATH } from "@/lib/admin/sections";

const TABLES = ["businesses", "jobs", "properties", "events", "food_places", "services", "videos", "photos"];

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ group: string; items: { id: string; title: string; sub?: string; href: string }[] }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const like = `%${term.replace(/[%_,()]/g, "")}%`;
    const t = setTimeout(async () => {
      const content = await Promise.all(TABLES.map(async (table) => {
        const { data } = await db.from(table).select("id,title,location,status").ilike("title", like).limit(5);
        return { group: ENTITY_LABEL[table] + "s", items: (data ?? []).map((r: Row) => ({ id: r.id, title: r.title, sub: [r.location, r.status].filter(Boolean).join(" · "), href: `${ENTITY_PATH[table]}?q=${encodeURIComponent(term)}` })) };
      }));
      const { data: users } = await db.from("profiles").select("id,full_name,email").or(`full_name.ilike.${like},email.ilike.${like}`).limit(5);
      const { data: reviews } = await db.from("reviews").select("id,body,target_title").ilike("body", like).limit(5);
      setResults([
        ...content,
        { group: "Users", items: (users ?? []).map((u: Row) => ({ id: u.id, title: u.full_name || u.email, sub: u.email, href: `/admin/users?q=${encodeURIComponent(term)}` })) },
        { group: "Reviews", items: (reviews ?? []).map((r: Row) => ({ id: r.id, title: r.body?.slice(0, 60) ?? "Review", sub: r.target_title, href: `/admin/reviews?q=${encodeURIComponent(term)}` })) },
      ].filter((g) => g.items.length));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search everything…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q.trim().length < 2 ? "Type at least 2 letters" : "No results"}</CommandEmpty>
        {results.map((g) => (
          <CommandGroup key={g.group} heading={g.group}>
            {g.items.map((i) => (
              <CommandItem key={g.group + i.id} value={`${g.group} ${i.title} ${i.id}`} onSelect={() => { onOpenChange(false); navigate(i.href); }}>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{i.title}</p>{i.sub && <p className="truncate text-xs text-muted-foreground">{i.sub}</p>}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
