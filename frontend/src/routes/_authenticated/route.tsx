import { Outlet, redirect } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Replaces the original _authenticated/route.tsx `beforeLoad` guard.
export async function authenticatedLoader() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect("/auth");
  return { user: data.user };
}

export default function AuthenticatedLayout() {
  return <Outlet />;
}
