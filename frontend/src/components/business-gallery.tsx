import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = { images: string[]; name: string; fallback: string };

/** Responsive business photo gallery with broken-image removal and a lightweight lightbox. */
export function BusinessGallery({ images, name, fallback }: Props) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const ok = images.filter((u) => !broken.has(u));
  const list = ok.length ? ok : [fallback];
  const drop = (u: string) => setBroken((s) => (s.has(u) ? s : new Set(s).add(u)));
  const [open, setOpen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const img = (u: string, i: number, cls: string) => (
    <button type="button" key={u} onClick={() => setOpen(i)} className={`relative block overflow-hidden bg-muted ${cls}`} aria-label={`View photo ${i + 1} of ${name}`}>
      <img src={u} alt={`${name} photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} decoding="async" onError={() => u !== fallback && drop(u)} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
      {i === 2 && list.length > 3 && <span className="absolute inset-0 grid place-items-center bg-foreground/50 text-lg font-bold text-background">+{list.length - 3} Photos</span>}
    </button>
  );

  const top = list.slice(0, 3);
  return (
    <>
      {/* Mobile: swipeable */}
      <div className="relative sm:hidden">
        <div ref={track} onScroll={(e) => { const el = e.currentTarget; setSlide(Math.round(el.scrollLeft / el.clientWidth)); }} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map((u, i) => <div key={u} className="w-full shrink-0 snap-center">{img(u, i, "aspect-[4/3] w-full")}</div>)}
        </div>
        {list.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-background">{Math.min(slide, list.length - 1) + 1} / {list.length}</span>}
      </div>
      {/* Desktop grid */}
      <div className={`mx-auto mt-4 hidden h-[420px] max-w-5xl gap-2 overflow-hidden rounded-2xl px-4 sm:grid ${top.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
        {top.length === 1 && img(top[0]!, 0, "h-full rounded-2xl")}
        {top.length === 2 && <>{img(top[0]!, 0, "col-span-2 h-full rounded-l-2xl")}{img(top[1]!, 1, "h-full rounded-r-2xl")}</>}
        {top.length === 3 && <>
          {img(top[0]!, 0, "col-span-2 h-full rounded-l-2xl")}
          <div className="grid h-full grid-rows-2 gap-2">{img(top[1]!, 1, "h-full rounded-tr-2xl")}{img(top[2]!, 2, "h-full rounded-br-2xl")}</div>
        </>}
      </div>
      {open !== null && <Lightbox list={list} index={open} name={name} onIndex={setOpen} onClose={() => setOpen(null)} onBroken={drop} />}
    </>
  );
}

function Lightbox({ list, index, name, onIndex, onClose, onBroken }: { list: string[]; index: number; name: string; onIndex: (i: number) => void; onClose: () => void; onBroken: (u: string) => void }) {
  const i = Math.min(index, list.length - 1);
  const go = useCallback((d: number) => onIndex((i + d + list.length) % list.length), [i, list.length, onIndex]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [go, onClose]);
  const btn = "grid h-11 w-11 place-items-center rounded-full bg-background/15 text-background hover:bg-background/30";
  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90 p-4">
      <img src={list[i]} alt={`${name} photo ${i + 1}`} onClick={(e) => e.stopPropagation()} onError={() => onBroken(list[i]!)} className="max-h-[85vh] max-w-full rounded-xl object-contain" />
      <button type="button" aria-label="Close" onClick={onClose} className={`${btn} absolute right-4 top-4`}><X className="h-5 w-5" /></button>
      {list.length > 1 && <>
        <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); go(-1); }} className={`${btn} absolute left-3 top-1/2 -translate-y-1/2`}><ChevronLeft className="h-6 w-6" /></button>
        <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); go(1); }} className={`${btn} absolute right-3 top-1/2 -translate-y-1/2`}><ChevronRight className="h-6 w-6" /></button>
      </>}
      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-background/15 px-3 py-1 text-sm font-semibold text-background">{i + 1} / {list.length}</span>
    </div>
  );
}
