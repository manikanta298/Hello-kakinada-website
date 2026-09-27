import { useState } from "react";
import { Briefcase } from "lucide-react";

/** Job image with priority listing → company → fallback; failed URLs fall through automatically. */
export function JobImage({ image, companyImage, alt, className = "", natural = false }: { natural?: boolean; image?: string | undefined; companyImage?: string | undefined; alt: string; className?: string }) {
  const sources = [image, companyImage].filter((u): u is string => !!u);
  const [i, setI] = useState(0);
  const src = sources[i];
  return (
    <div className={`relative overflow-hidden bg-secondary ${className} ${natural && !src ? "aspect-[4/3]" : ""}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setI((n) => n + 1)} className={natural ? "block h-auto w-full object-contain" : "h-full w-full object-cover"} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-secondary text-primary">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-card shadow-[var(--shadow-sm)]"><Briefcase className="h-7 w-7" aria-hidden /></span>
          <span className="text-xs font-medium text-muted-foreground">No image available</span>
        </div>
      )}
    </div>
  );
}
