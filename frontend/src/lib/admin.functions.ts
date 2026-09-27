// NOTE (MERN migration): originally a TanStack Start server function using
// the Supabase service-role client. Now a plain client-side function calling
// our Express API (src/routes/admin.routes.ts), which re-checks
// master_admin server-side exactly like the original assertMaster() did.
// Same exported names/signatures; throws on failure like the original
// server-function handler did, so existing try/catch call sites are unchanged.
import { API_BASE } from "./backend-client";

async function authedFetch(path: string, body: unknown) {
  const token = (() => {
    try {
      return localStorage.getItem("hk_auth_token");
    } catch {
      return null;
    }
  })();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export const createStaff = async ({ data }: { data: { email: string; password: string; name: string; role: string } }) => {
  return (await authedFetch("/api/admin/staff", data)) as { id: string };
};

export const deleteUser = async ({ data }: { data: { userId: string } }) => {
  return (await authedFetch("/api/admin/delete-user", data)) as { ok: true };
};
