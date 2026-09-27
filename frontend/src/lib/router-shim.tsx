// Small helpers bridging the gap between the old TanStack Router API this
// codebase was written against (validateSearch/loaderDeps, Route.useSearch(),
// Route.useNavigate({search: updater})) and React Router v6.4's data router.
// Kept deliberately minimal so route files needed the smallest possible edits.
import { useCallback, useEffect } from "react";
import { useNavigate as useRRNavigate, useSearchParams, useRouteError, type LoaderFunctionArgs } from "react-router-dom";

/** Raw query-string object, equivalent to what TanStack passed into
 *  validateSearch(). Route files already call their own parse/normalize
 *  helper (e.g. parseDirSearch, normDir) on the result, exactly as before. */
export function useRawSearch(): Record<string, unknown> {
  const [params] = useSearchParams();
  return Object.fromEntries(params.entries());
}

/** Same job as new URL(request.url).searchParams inside a loader — used in
 *  place of the old `loaderDeps: ({ search }) => search` + validated deps. */
export function rawSearchFromRequest(request: Request): Record<string, unknown> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

/** Replacement for `Route.useNavigate()` used ONLY where the original code
 *  called `navigate({ search: (s) => ({...}), resetScroll })` to patch the
 *  query string in place (see routes/$location.tsx, best-hotels-in-kakinada.tsx). */
export function useSearchNav() {
  const [params, setParams] = useSearchParams();
  return useCallback(
    (opts: { search?: (s: Record<string, unknown>) => Record<string, unknown>; resetScroll?: boolean }) => {
      const current = Object.fromEntries(params.entries());
      const next = opts.search ? opts.search(current) : current;
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(next)) if (v !== undefined && v !== null && v !== "") cleaned[k] = String(v);
      setParams(cleaned);
      if (opts.resetScroll !== false) window.scrollTo(0, 0);
    },
    [params, setParams],
  );
}

/** Sets document title/meta tags from a TanStack-style head() result:
 *  { meta: [{ title }, { name, content }, ...] }. Call once per page
 *  component; cleans up on unmount/route change. */
export function useSeo(head: { meta?: { title?: string; name?: string; content?: string }[] } | undefined) {
  useEffect(() => {
    if (!head?.meta) return;
    const added: HTMLElement[] = [];
    for (const m of head.meta) {
      if (m.title) {
        document.title = m.title;
        continue;
      }
      if (m.name && m.content) {
        let tag = document.querySelector(`meta[name="${m.name}"]`);
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute("name", m.name);
          document.head.appendChild(tag);
          added.push(tag as HTMLElement);
        }
        tag.setAttribute("content", m.content);
      }
    }
    return () => added.forEach((t) => t.remove());
  }, [head]);
}

/** Generic errorElement: shows notFoundComponent for a thrown 404 Response,
 *  else errorComponent (or a plain fallback), matching the original
 *  per-route notFoundComponent/errorComponent pair. */
export function RouteErrorBoundary({ notFound, error }: { notFound?: React.ReactNode; error?: React.ReactNode }) {
  const err = useRouteError();
  if (err instanceof Response && err.status === 404 && notFound) return <>{notFound}</>;
  if (error) return <>{error}</>;
  return <div className="p-10 text-center text-muted-foreground">Something went wrong. Please try again.</div>;
}

export { useRRNavigate as useNavigate };
export type { LoaderFunctionArgs };
