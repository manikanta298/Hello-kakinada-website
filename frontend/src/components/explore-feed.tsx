import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bookmark, Heart, MapPin, MessageCircle, Search, Share2, Volume2, VolumeX, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, type Row } from "@/lib/admin/db";

type Kind = "videos" | "photos";
type Item = Row & { kind: Kind };

const CHIPS: { label: string; match: string[] }[] = [
  { label: "All", match: [] },
  { label: "Food", match: ["Food"] },
  { label: "Places", match: ["Places", "Beaches", "Nature", "Culture"] },
  { label: "Events", match: ["Events"] },
  { label: "Businesses", match: ["Business", "Businesses"] },
  { label: "Lifestyle", match: ["Lifestyle", "Local Life", "News / Updates"] },
];

const COLS = "id,title,description,category,location,image_url,media_url,tags,likes,views,shares,sort_order,published_at";

async function fetchFeed(): Promise<Item[]> {
  const [v, p] = await Promise.all([
    db.from("videos").select(COLS).eq("status", "published").order("sort_order").order("published_at", { ascending: false }).limit(80),
    db.from("photos").select(COLS).eq("status", "published").order("sort_order").order("published_at", { ascending: false }).limit(80),
  ]);
  const vids = ((v.data ?? []) as Row[]).map((r) => ({ ...r, kind: "videos" as const }));
  const pics = ((p.data ?? []) as Row[]).map((r) => ({ ...r, kind: "photos" as const }));
  return [...vids, ...pics].sort((a, b) => (a.sort_order - b.sort_order) || String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")));
}

function record(kind: Kind, id: string, what: "view" | "like" | "share") {
  supabase.rpc("record_interaction", { _entity_type: kind, _entity_id: id, _kind: what }).then(() => undefined);
}

function useSessionSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => { try { setSet(new Set(JSON.parse(localStorage.getItem(key) ?? "[]"))); } catch { /* ignore */ } }, [key]);
  const toggle = (id: string) => setSet((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); localStorage.setItem(key, JSON.stringify([...n])); return n; });
  return [set, toggle] as const;
}

export function ExploreFeed() {
  const { data, isLoading } = useQuery({ queryKey: ["explore-feed"], queryFn: fetchFeed, staleTime: 60_000 });
  const [chip, setChip] = useState("All");
  const items = useMemo(() => {
    const m = CHIPS.find((c) => c.label === chip)?.match ?? [];
    return (data ?? []).filter((i) => !m.length || m.includes(i.category));
  }, [data, chip]);

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  useEffect(() => { if (sessionStorage.getItem("hk-sound") === "on") setMuted(false); }, []);
  const toggleMute = () => setMuted((m) => { sessionStorage.setItem("hk-sound", m ? "on" : "off"); return !m; });
  const [liked, toggleLike] = useSessionSet("hk-liked");
  const [saved, toggleSave] = useSessionSet("hk-saved");

  useEffect(() => { setActive(0); scroller.current?.scrollTo({ top: 0 }); }, [chip]);

  // visibility tracking
  useEffect(() => {
    const root = scroller.current; if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset["index"]));
    }, { root, threshold: 0.6 });
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const current = items[active];
  useEffect(() => { if (current) record(current.kind, current.id, "view"); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard navigation
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = scroller.current; if (!el) return;
      if (["ArrowDown", "j", "PageDown"].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: "smooth" }); }
      if (["ArrowUp", "k", "PageUp"].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: "smooth" }); }
      if (e.key === "m") toggleMute();
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const like = (i: Item) => { if (!liked.has(i.id)) record(i.kind, i.id, "like"); toggleLike(i.id); };
  const share = async (i: Item) => {
    record(i.kind, i.id, "share");
    const d = { title: i.title, text: `${i.title} — HelloKakinada.in`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(d); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(d.url); toast.success("Link copied"); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-feed text-feed-foreground">
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-feed/80 to-transparent pb-6">
        <div className="pointer-events-auto mx-auto flex max-w-[480px] items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <Link to="/" aria-label="Home" className="grid h-9 w-9 place-items-center rounded-full bg-feed-foreground/10 backdrop-blur"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="text-lg font-extrabold tracking-tight">Explore</h1>
          </div>
          <Link to={`/search?q=${encodeURIComponent(String(""))}`} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-full bg-feed-foreground/10 backdrop-blur"><Search className="h-4 w-4" /></Link>
        </div>
        <div className="no-scrollbar pointer-events-auto mx-auto mt-2 flex max-w-[480px] gap-1.5 overflow-x-auto px-4">
          {CHIPS.map((c) => (
            <button key={c.label} onClick={() => setChip(c.label)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${chip === c.label ? "bg-accent text-accent-foreground" : "bg-feed-foreground/10 text-feed-foreground/85 backdrop-blur"}`}>{c.label}</button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {isLoading && <div className="grid h-full place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-feed-foreground/20 border-t-accent" /></div>}
        {!isLoading && items.length === 0 && (
          <div className="grid h-full place-items-center px-8 text-center">
            <div><p className="text-lg font-bold">Nothing here yet</p><p className="mt-1 text-sm text-feed-foreground/60">New reels and photos from Kakinada are on the way.</p></div>
          </div>
        )}
        {items.map((it, i) => (
          <section key={`${it.kind}-${it.id}`} data-index={i} className="relative h-full w-full snap-start snap-always">
            <div className="relative mx-auto h-full w-full overflow-hidden md:my-0 md:max-w-[min(480px,calc(100dvh*9/16))]">
              {it.kind === "videos"
                ? <Reel item={it} isActive={i === active} near={Math.abs(i - active) <= 1} muted={muted} onToggleMute={toggleMute} onDoubleTap={() => { if (!liked.has(it.id)) like(it); }} />
                : <Photo item={it} near={Math.abs(i - active) <= 2} onDoubleTap={() => { if (!liked.has(it.id)) like(it); }} />}

              <Overlay item={it} />
              <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-4 md:bottom-10">
                <Action label={String(it.likes + (liked.has(it.id) ? 1 : 0))} active={liked.has(it.id)} onClick={() => like(it)}><Heart className={`h-6 w-6 ${liked.has(it.id) ? "fill-current" : ""}`} /></Action>
                <Action label="Chat" onClick={() => toast("Comments are coming soon")}><MessageCircle className="h-6 w-6" /></Action>
                <Action label="Share" onClick={() => share(it)}><Share2 className="h-6 w-6" /></Action>
                <Action label={saved.has(it.id) ? "Saved" : "Save"} active={saved.has(it.id)} onClick={() => { toggleSave(it.id); toast.success(saved.has(it.id) ? "Removed from saved" : "Saved"); }}><Bookmark className={`h-6 w-6 ${saved.has(it.id) ? "fill-current" : ""}`} /></Action>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Action({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-[11px] font-semibold drop-shadow">
      <span className={`grid h-12 w-12 place-items-center rounded-full backdrop-blur transition active:scale-90 ${active ? "bg-accent text-accent-foreground" : "bg-feed/35"}`}>{children}</span>
      {label}
    </button>
  );
}

function Overlay({ item }: { item: Item }) {
  const tags: string[] = item.tags ?? [];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-feed/90 via-feed/40 to-transparent px-4 pb-24 pt-24 pr-20 md:pb-8">
      {item.location && <p className="flex items-center gap-1 text-xs font-semibold text-accent"><MapPin className="h-3.5 w-3.5" />{item.location}</p>}
      <h2 className="mt-1 text-lg font-extrabold leading-tight">{item.title}</h2>
      {item.description && <p className="mt-1 line-clamp-2 text-sm text-feed-foreground/80">{item.description}</p>}
      {tags.length > 0 && <p className="mt-1.5 line-clamp-1 text-xs font-medium text-feed-foreground/70">{tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}</p>}
    </div>
  );
}

function useTaps(onSingle: () => void, onDouble: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const handler = useCallback((e: React.MouseEvent) => {
    if (t.current) {
      clearTimeout(t.current); t.current = null;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const h = { id: Date.now(), x: e.clientX - r.left, y: e.clientY - r.top };
      setHearts((s) => [...s, h]); setTimeout(() => setHearts((s) => s.filter((x) => x.id !== h.id)), 800);
      onDouble();
    } else {
      t.current = setTimeout(() => { t.current = null; onSingle(); }, 260);
    }
  }, [onSingle, onDouble]);
  const layer = hearts.map((h) => <Heart key={h.id} className="animate-heart pointer-events-none absolute z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-accent text-accent" style={{ left: h.x, top: h.y }} />);
  return { handler, layer };
}

function Reel({ item, isActive, near, muted, onToggleMute, onDoubleTap }: { item: Item; isActive: boolean; near: boolean; muted: boolean; onToggleMute: () => void; onDoubleTap: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (isActive) { v.play().then(() => setPaused(false)).catch(() => { v.muted = true; v.play().catch(() => setPaused(true)); }); }
    else { v.pause(); v.currentTime = 0; }
  }, [isActive, near]);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); } };
  const { handler, layer } = useTaps(toggle, onDoubleTap);
  return (
    <div className="absolute inset-0" onClick={handler}>
      {item.image_url && <img src={item.image_url} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${ready && near ? "opacity-0" : "opacity-100"}`} />}
      {near && item.media_url && (
        <video ref={ref} src={item.media_url} poster={item.image_url ?? undefined} muted={muted} loop playsInline preload="auto" onLoadedData={() => setReady(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {isActive && paused && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-feed/40 backdrop-blur"><Play className="ml-1 h-7 w-7 fill-current" /></span></span>}
      {isActive && !ready && <span className="pointer-events-none absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-feed-foreground/20 border-t-accent" />}
      {layer}
      <button aria-label={muted ? "Unmute" : "Mute"} onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="absolute right-3 top-28 z-10 grid h-9 w-9 place-items-center rounded-full bg-feed/40 backdrop-blur">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
    </div>
  );
}

function Photo({ item, near, onDoubleTap }: { item: Item; near: boolean; onDoubleTap: () => void }) {
  const [landscape, setLandscape] = useState(false);
  const { handler, layer } = useTaps(() => undefined, onDoubleTap);
  if (!near) return <div className="absolute inset-0 bg-feed" />;
  return (
    <div className="absolute inset-0" onClick={handler}>
      {landscape && <img src={item.image_url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />}
      <img src={item.image_url} alt={item.title} decoding="async" onLoad={(e) => setLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)} className={`absolute inset-0 h-full w-full ${landscape ? "object-contain" : "object-cover"}`} />
      {layer}
    </div>
  );
}
