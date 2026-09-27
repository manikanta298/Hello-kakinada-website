# HelloKakinada API (Express + TypeScript + MySQL)

Replaces the Supabase (Postgres + Auth + Storage) backend with a plain
Express/TypeScript/MySQL service. All RLS policies and SQL functions
(`has_role`, `is_admin`, `can_manage`, `record_interaction`) from the
original Postgres migrations are reimplemented here in TypeScript — see
`src/lib/acl.ts`, `src/routes/table.routes.ts`, `src/routes/public.routes.ts`.

## Setup

```bash
cp .env.example .env   # fill in DB_* and JWT_SECRET
npm install
npm run migrate        # creates the database + applies src/db/schema.sql
npm run dev             # http://localhost:4000
```

The **first account that ever signs up becomes `master_admin`**, exactly
like the original `handle_new_user()` Postgres trigger.

## API surface

- `POST /api/auth/signup|signin|signout`, `GET /api/auth/session`,
  `PATCH /api/auth/profile` — replaces `supabase.auth.*`
- `POST /api/table/:table/query` — generic query endpoint that replaces
  `supabase.from(table)...`. The frontend's `src/lib/db-client.ts` is a
  supabase-query-builder-compatible shim over this one endpoint, so admin
  screens (`content-manager.tsx`, `users.tsx`, `admin-users.tsx`, etc.) keep
  working unmodified.
- `GET /api/businesses`, `/api/businesses/:slug`, `/api/jobs`, `/api/jobs/:slug`,
  `/api/locations`, `/api/directory`, `/api/explore/feed`, `POST /api/interactions`
  — replaces `src/lib/listings.functions.ts` / `locations.functions.ts` /
  the `record_interaction` RPC.
- `POST /api/admin/staff`, `/api/admin/delete-user`, `/api/admin/import/google-sheet`
  — replaces `src/lib/admin.functions.ts` / `admin/import.functions.ts`.
- `POST /api/media/upload` — replaces the Supabase Storage `media` bucket
  (local disk under `uploads/`, served at `/media/...`). Point this at
  S3/Cloud Storage for production instead.

## Not carried over (Lovable/Supabase-platform-specific, out of scope for a MERN stack)

- Lovable preview-auth broker (`previewAuthStorage.ts`) and Lovable cron-secret
  auth (`cron-auth.ts`) — these only make sense inside Lovable's own hosting.
- "Continue with Google" OAuth (`lovable.auth.signInWithOAuth`) — wire up your
  own OAuth provider (e.g. `passport-google-oauth20`) if you need it; the
  email/password flow is fully implemented.
