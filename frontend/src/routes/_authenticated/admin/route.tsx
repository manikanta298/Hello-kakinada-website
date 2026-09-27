import { Link, Outlet, useLoaderData } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminContext, type AdminCtx } from "@/components/admin/context";
import { AdminShell } from "@/components/admin/shell";

// Replaces the original _authenticated/admin/route.tsx `beforeLoad`. Re-checks
// the session (cheap — the auth shim caches it) rather than threading data
// down from the parent authenticatedLoader, so this route's useLoaderData()
// gives everything AdminLayout needs directly.
export async function adminLoader(): Promise<{ admin: AdminCtx }> {
  const { data } = await supabase.auth.getUser();
  const user = data.user!;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name,status").eq("id", user.id).maybeSingle(),
  ]);
  const admin: AdminCtx = {
    userId: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? "",
    roles: profile?.status === "suspended" ? [] : (roles ?? []).map((r: { role: string }) => r.role),
  };
  return { admin };
}

export default function AdminLayout() {
  const { admin } = useLoaderData() as { admin: AdminCtx };
  if (!admin.roles.some((r) => r !== "user")) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/40 p-6 text-center">
        <div className="max-w-sm rounded-2xl border bg-card p-8">
          <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-extrabold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account ({admin.email}) doesn't have admin access. Ask the Master Admin to add you as staff.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to website</Link>
        </div>
      </div>
    );
  }
  return (
    <AdminContext.Provider value={admin}>
      <AdminShell><Outlet /></AdminShell>
    </AdminContext.Provider>
  );
}
