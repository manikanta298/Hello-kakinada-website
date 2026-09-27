// NOTE (MERN migration): this file used to construct a real @supabase/supabase-js
// client. It's kept at the same path/export name (`supabase`) so every existing
// import (`@/integrations/supabase/client`) across the app keeps working
// unchanged. Internally it now talks to our own Express/MySQL API — see
// src/lib/backend-client.ts for the implementation.
import { backendClient } from "@/lib/backend-client";

export const supabase = backendClient;
