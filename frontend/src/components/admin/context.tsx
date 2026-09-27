import { createContext, useContext } from "react";
import { canAccess } from "@/lib/admin/sections";

export type AdminCtx = { userId: string; email: string; name: string; roles: string[] };
export const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin outside admin");
  return { ...ctx, can: (section: string) => canAccess(ctx.roles, section), isMaster: ctx.roles.includes("master_admin") };
}
