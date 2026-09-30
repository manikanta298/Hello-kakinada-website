import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, LayoutGrid, Clapperboard, Image, Tags, BarChart3, Briefcase, Building2, Store, UtensilsCrossed, Wrench, CalendarDays,
  Users, Star, Flag, Bell, ShieldCheck, KeyRound, Settings, LogOut, ExternalLink, Search, Menu, PanelLeftClose, PanelLeft, FileUp, MapPin,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "./context";
import { GlobalSearch } from "./global-search";
import { ROLE_LABELS } from "@/lib/admin/sections";

const GROUPS = [
  { label: null, items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "dashboard", exact: true }] },
  { label: "Explore", items: [
    { to: "/admin/explore/content", label: "Explore Content", icon: LayoutGrid, section: "videos" },
    { to: "/admin/explore/videos", label: "Videos", icon: Clapperboard, section: "videos" },
    { to: "/admin/explore/photos", label: "Photos", icon: Image, section: "photos" },
    { to: "/admin/explore/categories", label: "Categories", icon: Tags, section: "categories" },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3, section: "analytics" },
  ] },
  { label: "Directory", items: [
    { to: "/admin/jobs", label: "Jobs", icon: Briefcase, section: "jobs" },
    { to: "/admin/properties", label: "Rent / Buy", icon: Building2, section: "properties" },
    { to: "/admin/businesses", label: "Businesses", icon: Store, section: "businesses" },
    { to: "/admin/food", label: "Food", icon: UtensilsCrossed, section: "food" },
    { to: "/admin/services", label: "Services", icon: Wrench, section: "services" },
    { to: "/admin/events", label: "Events", icon: CalendarDays, section: "events" },
    { to: "/admin/locations", label: "Locations", icon: MapPin, section: "categories" },
    { to: "/admin/import", label: "Bulk Import", icon: FileUp, section: "businesses" },
  ] },
  { label: "Community", items: [
    { to: "/admin/users", label: "Users", icon: Users, section: "users" },
    { to: "/admin/reviews", label: "Reviews", icon: Star, section: "reviews" },
    { to: "/admin/reports", label: "Reports", icon: Flag, section: "reports" },
    { to: "/admin/notifications", label: "Notifications", icon: Bell, section: "notifications" },
  ] },
  { label: "System", items: [
    { to: "/admin/admin-users", label: "Admin Users", icon: ShieldCheck, section: "admin-users" },
    { to: "/admin/roles", label: "Roles & Permissions", icon: KeyRound, section: "roles" },
    { to: "/admin/settings", label: "Settings", icon: Settings, section: "settings" },
  ] },
] as const;

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { can, name, email, roles } = useAdmin();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  const mainRole = roles.find((r) => r !== "user") ?? "user";
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" onClick={onNavigate} aria-label="HelloKakinada CMS dashboard" className={`flex h-16 items-center border-b ${collapsed ? "justify-center px-2" : "gap-2 px-4"}`}>
        {collapsed ? (
          <img src="/favicon.png" alt="" className="h-9 w-9 object-contain" />
        ) : (
          <><span className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-tight sm:text-xl">Hello<span className="text-primary">Kakinada</span>.in</span><span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">CMS</span></>
        )}
      </Link>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => can(i.section));
          if (!items.length) return null;
          return (
            <div key={g.label ?? "main"} className="mb-3">
              {g.label && !collapsed && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</p>}
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} onClick={onNavigate} title={i.label} end={"exact" in i}
                  className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ${isActive ? "bg-primary/10 !text-primary" : ""}`}>
                  <i.icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">{i.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{(name || email).charAt(0).toUpperCase()}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{name || email}</p><p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[mainRole] ?? "User"}</p></div>}
        </div>
        <a href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><ExternalLink className="h-4 w-4" />{!collapsed && "View Website"}</a>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><LogOut className="h-4 w-4" />{!collapsed && "Logout"}</button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const path = useLocation().pathname;
  useEffect(() => setMobile(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className={`sticky top-0 hidden h-screen shrink-0 border-r bg-card transition-[width] md:block ${collapsed ? "w-16" : "w-64"}`}>
        <Nav collapsed={collapsed} />
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-72 p-0"><SheetTitle className="sr-only">Admin menu</SheetTitle><Nav collapsed={false} onNavigate={() => setMobile(false)} /></SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
          <button aria-label="Open menu" onClick={() => setMobile(true)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary md:hidden"><Menu className="h-5 w-5" /></button>
          <button aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)} className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-secondary md:grid">{collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
          <button onClick={() => setSearch(true)} className="flex w-full max-w-md items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary">
            <Search className="h-4 w-4" /><span className="flex-1 text-left">Search businesses, jobs, users…</span>
            <kbd className="hidden rounded border bg-secondary px-1.5 text-[10px] font-semibold sm:inline">Ctrl K</kbd>
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <GlobalSearch open={search} onOpenChange={setSearch} />
    </div>
  );
}
