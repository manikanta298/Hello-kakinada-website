import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAdmin } from "./context";
import { RANGES } from "@/lib/admin/db";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">{label}{icon}</div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-card ${className}`}>
      {title && <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-sm font-bold">{title}</h2>{action}</div>}
      <div className="p-4">{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  resolved: "bg-success/15 text-success",
  sent: "bg-success/15 text-success",
  active: "bg-success/15 text-success",
  pending: "bg-warning/20 text-warning-foreground",
  open: "bg-warning/20 text-warning-foreground",
  scheduled: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-secondary text-secondary-foreground",
  dismissed: "bg-secondary text-secondary-foreground",
  hidden: "bg-secondary text-secondary-foreground",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
  reported: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

export function RangeTabs({ value, onChange, options = RANGES.map((r) => r.key) }: { value: string; onChange: (v: string) => void; options?: readonly string[] }) {
  const all = [...RANGES, { key: "all", label: "All Time", days: 3650 }];
  return (
    <div className="inline-flex rounded-xl border bg-card p-1">
      {all.filter((r) => options.includes(r.key)).map((r) => (
        <button key={r.key} onClick={() => onChange(r.key)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${value === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r.label}</button>
      ))}
    </div>
  );
}

export function rangeDays(key: string) {
  return key === "all" ? 3650 : RANGES.find((r) => r.key === key)?.days ?? 30;
}

export function Guard({ section, children }: { section: string; children: ReactNode }) {
  const { can } = useAdmin();
  if (!can(section)) {
    return (
      <div className="grid place-items-center rounded-2xl border bg-card p-12 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-bold">You don't have access to this section</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask a Master Admin to give your account the right role.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
