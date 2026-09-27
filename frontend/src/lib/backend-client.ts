// Backend client for the MERN migration. Replaces @supabase/supabase-js.
// Exposes the same shapes the app already calls (`supabase.auth.*`,
// `supabase.from(table)...`, `supabase.rpc(...)`) so that every component
// and route file that talks to "supabase" keeps working unchanged — only
// this module's internals changed, from calling Supabase to calling our
// own Express API.

export const API_BASE = (import.meta as any).env?.["VITE_API_URL"] || "http://localhost:4000";

// ---------------------------------------------------------------------------
// token storage + auth state pub-sub (replaces supabase-js's internal session store)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "hk_auth_token";
type Listener = (event: string, session: Session | null) => void;
const listeners = new Set<Listener>();

export type SessionUser = { id: string; email: string; user_metadata?: { full_name?: string | null } };
export type Session = { access_token: string; user: SessionUser };

let cachedSession: Session | null = null;

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore (SSR / disabled storage) */
  }
}

function notify(event: string, session: Session | null) {
  cachedSession = session;
  for (const l of listeners) l(event, session);
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

async function refreshSessionFromServer(): Promise<Session | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await apiFetch("/api/auth/session");
  if (!res.ok) return null;
  const body = (await res.json()) as { user: SessionUser | null };
  if (!body.user) return null;
  return { access_token: token, user: body.user };
}

// ---------------------------------------------------------------------------
// auth shim — mirrors supabase.auth
// ---------------------------------------------------------------------------
export const authShim = {
  async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
    if (!cachedSession) cachedSession = await refreshSessionFromServer();
    return { data: { session: cachedSession }, error: null };
  },
  async getUser(): Promise<{ data: { user: SessionUser | null }; error: string | null }> {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await apiFetch("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
    const body = await res.json();
    if (!res.ok) return { data: { session: null, user: null }, error: { message: body.error ?? "Sign in failed" } };
    setStoredToken(body.token);
    const session: Session = { access_token: body.token, user: body.user };
    notify("SIGNED_IN", session);
    return { data: { session, user: session.user }, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string }; emailRedirectTo?: string } }) {
    const res = await apiFetch("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, full_name: options?.data?.["full_name"] }) });
    const body = await res.json();
    if (!res.ok) return { data: { session: null, user: null }, error: { message: body.error ?? "Sign up failed" } };
    setStoredToken(body.token);
    const session: Session = { access_token: body.token, user: body.user };
    notify("SIGNED_IN", session);
    return { data: { session, user: session.user }, error: null };
  },
  async signOut() {
    await apiFetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    setStoredToken(null);
    notify("SIGNED_OUT", null);
    return { error: null };
  },
  onAuthStateChange(cb: Listener) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => { listeners.delete(cb); } } } };
  },
};

// ---------------------------------------------------------------------------
// query builder — mirrors the subset of supabase-js's `.from(table)` chain
// this app uses. Accumulates a spec, executes on `await`/`.then()`.
// ---------------------------------------------------------------------------
type FilterOp = "eq" | "neq" | "in" | "ilike" | "or" | "gte" | "lte" | "gt" | "lt";
type Filter = { col: string; op: FilterOp; value: unknown };
type OrderOpt = { ascending?: boolean };

class QueryBuilder<T = any> implements PromiseLike<{ data: T; error: { message: string } | null; count: number | null }> {
  private table: string;
  private opField: "select" | "insert" | "update" | "delete" = "select";
  private columns = "*";
  private countMode: "exact" | undefined;
  private headOnly = false;
  private filters: Filter[] = [];
  private orderSpecs: { col: string; ascending: boolean }[] = [];
  private rangeSpec: [number, number] | undefined;
  private limitSpec: number | undefined;
  private singleMode: "maybeSingle" | "single" | undefined;
  private writeValues: unknown;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }) {
    this.opField = "select";
    this.columns = columns;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push({ col, op: "eq", value });
    return this;
  }
  neq(col: string, value: unknown) {
    this.filters.push({ col, op: "neq", value });
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push({ col, op: "in", value: values });
    return this;
  }
  ilike(col: string, value: string) {
    this.filters.push({ col, op: "ilike", value });
    return this;
  }
  gte(col: string, value: unknown) {
    this.filters.push({ col, op: "gte", value });
    return this;
  }
  lte(col: string, value: unknown) {
    this.filters.push({ col, op: "lte", value });
    return this;
  }
  gt(col: string, value: unknown) {
    this.filters.push({ col, op: "gt", value });
    return this;
  }
  lt(col: string, value: unknown) {
    this.filters.push({ col, op: "lt", value });
    return this;
  }
  or(raw: string) {
    this.filters.push({ col: "", op: "or", value: raw });
    return this;
  }
  order(col: string, opts?: OrderOpt) {
    this.orderSpecs.push({ col, ascending: opts?.ascending !== false });
    return this;
  }
  range(from: number, to: number) {
    this.rangeSpec = [from, to];
    return this;
  }
  limit(n: number) {
    this.limitSpec = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.opField = "insert";
    this.writeValues = values;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.opField = "update";
    this.writeValues = values;
    return this;
  }
  delete(opts?: { count?: "exact" }) {
    this.opField = "delete";
    if (opts?.count) this.countMode = opts.count;
    return this;
  }

  private async execute(): Promise<{ data: T; error: { message: string } | null; count: number | null }> {
    const spec = {
      op: this.opField,
      columns: this.columns,
      count: this.countMode,
      head: this.headOnly,
      filters: this.filters,
      order: this.orderSpecs,
      range: this.rangeSpec,
      limit: this.limitSpec,
      single: this.singleMode,
      values: this.writeValues,
    };
    try {
      const res = await apiFetch(`/api/table/${this.table}/query`, { method: "POST", body: JSON.stringify(spec) });
      const body = await res.json();
      if (!res.ok) return { data: null as T, error: { message: body.error ?? `Request failed (${res.status})` }, count: body.count ?? null };
      return { data: body.data as T, error: body.error ? { message: body.error } : null, count: body.count ?? null };
    } catch (err) {
      return { data: null as T, error: { message: err instanceof Error ? err.message : String(err) }, count: null };
    }
  }

  then<TResult1 = { data: T; error: { message: string } | null; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: { message: string } | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------------------
// storage shim — mirrors supabase.storage.from("media").upload/createSignedUrl
// ---------------------------------------------------------------------------
const storageShim = {
  from(_bucket: string) {
    return {
      async upload(path: string, file: File, _opts?: unknown) {
        const folder = path.split("/")[0] ?? "misc";
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const res = await apiFetch("/api/media/upload", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) return { data: null, error: { message: body.error ?? "Upload failed" } };
        return { data: { path, url: body.url as string }, error: null };
      },
      async createSignedUrl(path: string, _expiresIn: number) {
        // Uploads already return a public URL (see upload() above); this app
        // calls upload() then createSignedUrl() back-to-back, so stash the
        // last uploaded URL keyed by path.
        const url = lastUploadedUrls.get(path);
        if (!url) return { data: null, error: new Error("No uploaded file found for that path") };
        return { data: { signedUrl: url }, error: null };
      },
    };
  },
};
const lastUploadedUrls = new Map<string, string>();
const _origUpload = storageShim.from;
storageShim.from = (bucket: string) => {
  const inner = _origUpload(bucket);
  const originalUpload = inner.upload;
  inner.upload = async (path: string, file: File, opts?: unknown) => {
    const result = await originalUpload(path, file, opts);
    if (result.data?.url) lastUploadedUrls.set(path, result.data.url);
    return result;
  };
  return inner;
};

// ---------------------------------------------------------------------------
// rpc shim — mirrors supabase.rpc(name, args). Only `record_interaction`
// is actually called from the client (see components/explore-feed.tsx).
// ---------------------------------------------------------------------------
async function rpc(name: string, args: Record<string, unknown>) {
  if (name === "record_interaction") {
    const res = await apiFetch("/api/interactions", {
      method: "POST",
      body: JSON.stringify({ entity_type: args["_entity_type"], entity_id: args["_entity_id"], kind: args["_kind"] }),
    });
    return { data: res.ok, error: res.ok ? null : { message: "Failed" } };
  }
  return { data: null, error: { message: `Unsupported rpc: ${name}` } };
}

// ---------------------------------------------------------------------------
// the unified client — same shape as the old `supabase` export
// ---------------------------------------------------------------------------
export const backendClient = {
  auth: authShim,
  from: <T = any>(table: string) => new QueryBuilder<T>(table),
  rpc,
  storage: storageShim,
};
