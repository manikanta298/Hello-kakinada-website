import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

type L = { slug: string; name: string; image_url: string | null; count: number; description: string | null };

export function PopularLocations({ locations }: { locations: L[] }) {
  if (!locations.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {locations.map((l) => (
        <Link key={l.slug} to={`/${l.slug}`} className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary">
          {l.image_url && <img src={l.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-15" />}
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
          <p className="relative mt-3 font-bold group-hover:text-primary">{l.name}</p>
          <p className="relative text-sm text-muted-foreground">{l.count} listing{l.count === 1 ? "" : "s"}</p>
        </Link>
      ))}
    </div>
  );
}
