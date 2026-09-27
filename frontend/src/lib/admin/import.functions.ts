// NOTE (MERN migration): originally a TanStack Start server function that
// fetched the Google Sheet server-side. Now calls the Express proxy at
// src/routes/admin.routes.ts (POST /api/admin/import/google-sheet), which
// performs the same fetch + permission check server-side. Same exported
// name/signature.
import { API_BASE } from "../backend-client";

export const fetchGoogleSheet = async ({ data }: { data: { url: string } }) => {
  const token = (() => {
    try {
      return localStorage.getItem("hk_auth_token");
    } catch {
      return null;
    }
  })();
  const res = await fetch(`${API_BASE}/api/admin/import/google-sheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Could not fetch the sheet");
  return json as { base64: string };
};
