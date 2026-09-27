import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { useRawSearch, useSearchNav, useSeo } from "@/lib/router-shim";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileSpreadsheet, Link2, Upload, Download, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle, Copy, XCircle } from "lucide-react";
import { PageHeader, Panel, Kpi } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/context";
import { canAccess } from "@/lib/admin/sections";
import { db, fmt, type Row } from "@/lib/admin/db";
import { fetchGoogleSheet } from "@/lib/admin/import.functions";
import { TARGETS, autoMap, prepareRow, findDuplicate, toDbRow, slugify, toCsv, type Kind, type Prepared, type Existing } from "@/lib/admin/importer";

export const path = "/_authenticated/admin/import";
const routeMeta = {
  head: () => ({ meta: [{ title: "Bulk Import — HelloKakinada Admin" }, { name: "robots", content: "noindex" }] }),
  component: ImportPage,
};
export default routeMeta;


type DupAction = "skip" | "update" | "create";
type Result = { index: number; outcome: "imported" | "updated" | "skipped" | "failed"; reason?: string };
const BATCH = 50;

function ImportPage() {
  const admin = useAdmin();
  const allowed = (["businesses", "jobs"] as Kind[]).filter((k) => canAccess(admin.roles, k));
  const [kind, setKind] = useState<Kind>(allowed[0] ?? "businesses");
  if (!allowed.length) return <div className="p-6 text-sm text-muted-foreground">You don't have access to import listings.</div>;
  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Import" sub="Add many businesses or jobs at once from Google Sheets, Excel or CSV." />
      <div className="inline-flex rounded-xl border bg-card p-1">
        {allowed.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {k === "businesses" ? "Business Listings" : "Job Listings"}
          </button>
        ))}
      </div>
      <Importer key={kind} kind={kind} />
      <History kind={kind} />
    </div>
  );
}

function Importer({ kind }: { kind: Kind }) {
  const table = kind;
  const label = kind === "businesses" ? "Listings" : "Jobs";
  const getSheet = fetchGoogleSheet;
  const [book, setBook] = useState<XLSX.WorkBook | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [source, setSource] = useState<"google_sheet" | "file">("file");
  const [sheetName, setSheetName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Existing[] | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [dupDefault, setDupDefault] = useState<DupAction>("skip");
  const [dupChoice, setDupChoice] = useState<Record<number, DupAction>>({});
  const [results, setResults] = useState<Record<number, Result>>({});
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [logged, setLogged] = useState(false);

  const rows = useMemo<Record<string, unknown>[]>(() => (book && sheetName ? XLSX.utils.sheet_to_json(book.Sheets[sheetName]!, { defval: "", raw: false }) : []), [book, sheetName]);
  const headers = useMemo(() => Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((h) => !h.startsWith("__EMPTY")), [rows]);
  useEffect(() => { setMap(autoMap(kind, headers)); setResults({}); setDupChoice({}); setLogged(false); }, [headers, kind]);

  useEffect(() => {
    let off = false;
    (async () => {
      const all: Existing[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from(table).select("id,title,slug,details,location").range(from, from + 999);
        if (error) { toast.error(error.message); break; }
        all.push(...(data as Existing[]));
        if (!data || data.length < 1000) break;
      }
      if (!off) setExisting(all);
    })();
    return () => { off = true; };
  }, [table]);

  const prepared = useMemo<Prepared[]>(() => {
    if (!existing) return [];
    const seen: Existing[] = [];
    return rows.map((r, i) => {
      const p = prepareRow(kind, r, map, i + 2);
      if (!p.errors.length) {
        const d = findDuplicate(p.record, existing) ?? findDuplicate(p.record, seen);
        if (d) p.duplicateOf = { id: d.e.id, title: d.e.title, phone: String(d.e.details?.["phone"] ?? ""), reason: seen.includes(d.e) ? `repeated in this sheet (${d.reason})` : d.reason };
        seen.push({ id: `row-${i}`, title: String(p.record["title"]), slug: null, location: null, details: p.record });
      }
      return p;
    });
  }, [rows, map, existing, kind]);

  const counts = useMemo(() => {
    const errors = prepared.filter((p) => p.errors.length).length;
    const dups = prepared.filter((p) => !p.errors.length && p.duplicateOf).length;
    return { total: prepared.length, errors, dups, valid: prepared.length - errors - dups };
  }, [prepared]);
  const actionFor = (p: Prepared): DupAction => dupChoice[p.index] ?? dupDefault;
  const toProcess = prepared.filter((p) => !p.errors.length && (!p.duplicateOf || actionFor(p) !== "skip"));
  const done = Object.keys(results).length;
  const totalWork = prepared.length;

  const load = (wb: XLSX.WorkBook, name: string, src: "google_sheet" | "file") => {
    setBook(wb); setSourceName(name); setSource(src); setSheetName(wb.SheetNames[0] ?? "");
  };
  const onFile = async (f: File) => {
    try { load(XLSX.read(await f.arrayBuffer()), f.name, "file"); } catch { toast.error("Couldn't read that file. Use .xlsx, .xls or .csv"); }
  };
  const onSheet = async () => {
    setLoading(true);
    try {
      const { base64 } = await getSheet({ data: { url } });
      load(XLSX.read(base64, { type: "base64" }), url, "google_sheet");
      toast.success("Sheet loaded");
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  };

  const run = async () => {
    if (!existing) return;
    stopRef.current = false; setRunning(true);
    const usedSlugs = new Set(existing.map((e) => e.slug).filter(Boolean) as string[]);
    const uniqueSlug = (t: string) => { const b = slugify(t); let s = b, n = 2; while (usedSlugs.has(s)) s = `${b}-${n++}`; usedSlugs.add(s); return s; };
    const pending = prepared.filter((p) => !results[p.index]);
    const local: Record<number, Result> = {};
    for (const p of pending) {
      if (p.errors.length) local[p.index] = { index: p.index, outcome: "failed", reason: p.errors.join("; ") };
      else if (p.duplicateOf && actionFor(p) === "skip") local[p.index] = { index: p.index, outcome: "skipped", reason: `Duplicate of "${p.duplicateOf.title}" (${p.duplicateOf.reason})` };
    }
    setResults((r) => ({ ...r, ...local }));
    const work = pending.filter((p) => !local[p.index]);
    for (let i = 0; i < work.length; i += BATCH) {
      if (stopRef.current) break;
      const batch = work.slice(i, i + BATCH);
      const inserts = batch.filter((p) => !(p.duplicateOf && actionFor(p) === "update") || p.duplicateOf.id.startsWith("row-"));
      const updates = batch.filter((p) => !inserts.includes(p));
      const out: Record<number, Result> = {};
      if (inserts.length) {
        const payload = inserts.map((p) => toDbRow(kind, p.record, status, uniqueSlug(String(p.record["title"]))));
        const { error } = await db.from(table).insert(payload);
        if (!error) inserts.forEach((p) => (out[p.index] = { index: p.index, outcome: "imported" }));
        else {
          // retry one by one so a single bad row doesn't fail the batch
          await Promise.all(inserts.map(async (p, j) => {
            const { error: e } = await db.from(table).insert(payload[j]!);
            out[p.index] = e ? { index: p.index, outcome: "failed", reason: e.message } : { index: p.index, outcome: "imported" };
          }));
        }
      }
      await Promise.all(updates.map(async (p) => {
        const ex = existing.find((e) => e.id === p.duplicateOf!.id);
        const row = toDbRow(kind, p.record, status, ex?.slug || uniqueSlug(String(p.record["title"])));
        row["details"] = { ...(ex?.details ?? {}), ...(row["details"] as Row) };
        const { error } = await db.from(table).update(row).eq("id", p.duplicateOf!.id);
        out[p.index] = error ? { index: p.index, outcome: "failed", reason: error.message } : { index: p.index, outcome: "updated" };
      }));
      setResults((r) => ({ ...r, ...out }));
    }
    setRunning(false);
  };

  const summary = useMemo(() => {
    const v = Object.values(results);
    return { imported: v.filter((r) => r.outcome === "imported").length, updated: v.filter((r) => r.outcome === "updated").length, skipped: v.filter((r) => r.outcome === "skipped").length, failed: v.filter((r) => r.outcome === "failed").length };
  }, [results]);
  const complete = totalWork > 0 && done === totalWork && !running;
  const failedRows = () => Object.values(results).filter((r) => r.outcome === "failed" || r.outcome === "skipped").map((r) => ({ "Sheet row": r.index, Result: r.outcome, Reason: r.reason ?? "", ...prepared.find((p) => p.index === r.index)?.raw }));

  useEffect(() => {
    if (!complete || logged) return;
    setLogged(true);
    void db.from("import_logs").insert({ kind, source, source_name: `${sourceName}${book && book.SheetNames.length > 1 ? ` › ${sheetName}` : ""}`, total: totalWork, ...summary, failed_rows: failedRows().filter((r) => r.Result === "failed").slice(0, 2000) })
      .then(({ error }) => { if (error) toast.error(`Couldn't save import history: ${error.message}`); });
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = () => {
    const blob = new Blob([toCsv(failedRows())], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${kind}-import-problems.csv`; a.click();
  };
  const reset = () => { setBook(null); setSheetName(""); setResults({}); setUrl(""); };

  return (
    <div className="space-y-6">
      {!book && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Google Sheet link">
            <p className="text-sm text-muted-foreground">Share your sheet as <b>Anyone with the link → Viewer</b>, then paste the link.</p>
            <div className="mt-3 flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm" />
              <button disabled={!url || loading} onClick={onSheet} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Link2 className="h-4 w-4" />{loading ? "Loading…" : "Load"}</button>
            </div>
          </Panel>
          <Panel title="Excel / CSV file">
            <p className="text-sm text-muted-foreground">Upload a .xlsx, .xls or .csv file. Each row becomes one {kind === "businesses" ? "listing" : "job"}.</p>
            <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-semibold hover:bg-secondary">
              <Upload className="h-4 w-4" /> Choose file
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            <button onClick={() => { const ws = XLSX.utils.aoa_to_sheet([TARGETS[kind].map((t) => t.label)]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, label); XLSX.writeFile(wb, `hellokakinada-${kind}-template.xlsx`); }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Download className="h-3 w-3" />Download blank template</button>
          </Panel>
        </div>
      )}

      {book && (
        <>
          <Panel title="1. Source" action={<button onClick={reset} disabled={running} className="text-xs font-semibold text-primary">Change source</button>}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" /><span className="max-w-md truncate font-medium">{sourceName}</span>
              {book.SheetNames.length > 1 && (
                <select value={sheetName} onChange={(e) => setSheetName(e.target.value)} disabled={running} className="h-9 rounded-lg border bg-background px-2">
                  {book.SheetNames.map((n) => <option key={n}>{n}</option>)}
                </select>
              )}
              <span className="text-muted-foreground">{rows.length} rows</span>
            </div>
          </Panel>

          <Panel title="2. Match columns">
            <p className="mb-3 text-sm text-muted-foreground">We matched your column names automatically. Change any that are wrong.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TARGETS[kind].map((t) => (
                <label key={t.key} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{t.label}{t.required && <span className="text-destructive"> *</span>}</span>
                  <select value={map[t.key] ?? ""} disabled={running} onChange={(e) => setMap((m) => ({ ...m, [t.key]: e.target.value }))} className="h-8 max-w-[55%] rounded-md border bg-background px-2 text-xs">
                    <option value="">— not used —</option>
                    {headers.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">SEO title, meta description and focus keyword are written from your own data when not provided. Nothing is made up — empty cells stay empty.</p>
          </Panel>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Total rows" value={fmt.number(counts.total)} />
            <Kpi label="Valid" value={fmt.number(counts.valid)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <Kpi label="Possible duplicates" value={fmt.number(counts.dups)} icon={<Copy className="h-4 w-4" />} />
            <Kpi label="Errors" value={fmt.number(counts.errors)} icon={<XCircle className="h-4 w-4" />} />
          </div>

          <Panel title="3. Review">
            {!existing ? <p className="text-sm text-muted-foreground">Checking existing {label.toLowerCase()}…</p> : (
              <div className="max-h-[460px] overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-2">Row</th><th className="p-2">{TARGETS[kind][0]!.label}</th><th className="p-2">Category</th><th className="p-2">Phone</th>{kind === "businesses" && <th className="p-2">Photos</th>}<th className="p-2">Check</th><th className="p-2">Result</th></tr>
                  </thead>
                  <tbody>
                    {prepared.slice(0, 500).map((p) => (
                      <tr key={p.index} className="border-t align-top">
                        <td className="p-2 text-muted-foreground">{p.index}</td>
                        <td className="p-2 font-medium">{String(p.record["title"] ?? "—")}</td>
                        <td className="p-2">{String(p.record["category"] ?? "—")}</td>
                        <td className="p-2">{String(p.record["phone"] ?? "—")}</td>
                        {kind === "businesses" && (() => { const imgs = (p.record["images"] as string[] | undefined) ?? []; return (
                          <td className="p-2">{imgs.length ? <div className="flex items-center gap-2"><img src={imgs[0]} alt="" loading="lazy" className="h-10 w-14 rounded object-cover bg-muted" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /><span className="whitespace-nowrap text-xs text-muted-foreground">{imgs.length} image{imgs.length > 1 ? "s" : ""} detected</span></div> : <span className="text-xs text-muted-foreground">No images</span>}</td>
                        ); })()}
                        <td className="p-2">
                          {p.errors.length ? <span className="text-destructive">{p.errors.join("; ")}</span>
                            : p.duplicateOf ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><AlertTriangle className="h-3 w-3" />Possible duplicate</span>
                                <div className="text-xs text-muted-foreground">{p.duplicateOf.title}{p.duplicateOf.phone ? ` · ${p.duplicateOf.phone}` : ""} — {p.duplicateOf.reason}</div>
                                <select value={actionFor(p)} disabled={running || !!results[p.index]} onChange={(e) => setDupChoice((c) => ({ ...c, [p.index]: e.target.value as DupAction }))} className="h-7 rounded border bg-background px-1 text-xs">
                                  <option value="skip">Skip</option>
                                  {!p.duplicateOf.id.startsWith("row-") && <option value="update">Update existing</option>}
                                  <option value="create">Create anyway</option>
                                </select>
                              </div>
                            ) : <span className="text-primary">Ready</span>}
                        </td>
                        <td className="p-2 text-xs">{results[p.index] ? <span className={results[p.index]!.outcome === "failed" ? "text-destructive" : ""}>{results[p.index]!.outcome}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prepared.length > 500 && <p className="p-2 text-xs text-muted-foreground">Showing first 500 of {prepared.length} rows. All rows will be imported.</p>}
              </div>
            )}
          </Panel>

          <Panel title="4. Import">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">Save as
                <select value={status} disabled={running || done > 0} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className="h-9 rounded-lg border bg-background px-2"><option value="draft">Draft</option><option value="published">Published</option></select>
              </label>
              {counts.dups > 0 && (
                <label className="flex items-center gap-2">All duplicates
                  <select value={dupDefault} disabled={running || done > 0} onChange={(e) => { setDupDefault(e.target.value as DupAction); setDupChoice({}); }} className="h-9 rounded-lg border bg-background px-2"><option value="skip">Skip</option><option value="update">Update existing</option><option value="create">Create anyway</option></select>
                </label>
              )}
              <div className="ml-auto flex gap-2">
                {running ? (
                  <button onClick={() => (stopRef.current = true)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold"><Pause className="h-4 w-4" />Pause</button>
                ) : !complete ? (
                  <button disabled={!existing || !toProcess.length && done === 0 && counts.total === 0} onClick={run} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">
                    <Play className="h-4 w-4" />{done > 0 ? `Resume (${totalWork - done} left)` : `Import ${toProcess.length} ${label}`}
                  </button>
                ) : (
                  <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold"><RotateCcw className="h-4 w-4" />New import</button>
                )}
              </div>
            </div>
            {(running || done > 0) && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground"><span>{complete ? "Import complete" : running ? `Importing ${done} / ${totalWork}` : `Paused at ${done} / ${totalWork}`}</span><span>{Math.round((done / Math.max(1, totalWork)) * 100)}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(done / Math.max(1, totalWork)) * 100}%` }} /></div>
              </div>
            )}
            {complete && (
              <div className="mt-4 rounded-xl border bg-secondary/40 p-4">
                <h3 className="font-extrabold">Import complete</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  <span>Total: <b>{totalWork}</b></span><span>Imported: <b>{summary.imported}</b></span><span>Updated: <b>{summary.updated}</b></span><span>Duplicates skipped: <b>{summary.skipped}</b></span><span>Failed: <b>{summary.failed}</b></span>
                </div>
                {summary.failed + summary.skipped > 0 && <button onClick={download} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Download className="h-4 w-4" />Download skipped & failed rows (CSV)</button>}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function History({ kind }: { kind: Kind }) {
  const [logs, setLogs] = useState<Row[]>([]);
  useEffect(() => {
    void db.from("import_logs").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(20).then(({ data }) => setLogs(data ?? []));
  }, [kind]);
  const dl = (l: Row) => {
    const blob = new Blob([toCsv(l.failed_rows ?? [])], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `import-${l.id.slice(0, 8)}-failed.csv`; a.click();
  };
  return (
    <Panel title="Previous imports">
      {!logs.length ? <p className="text-sm text-muted-foreground">No imports yet.</p> : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">When</th><th className="p-2">Source</th><th className="p-2">Total</th><th className="p-2">Imported</th><th className="p-2">Updated</th><th className="p-2">Skipped</th><th className="p-2">Failed</th><th /></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{fmt.date(l.created_at)}</td>
                  <td className="max-w-[240px] truncate p-2">{l.source === "google_sheet" ? "Google Sheet" : "File"} · {l.source_name}</td>
                  <td className="p-2">{l.total}</td><td className="p-2">{l.imported}</td><td className="p-2">{l.updated}</td><td className="p-2">{l.skipped}</td><td className="p-2">{l.failed}</td>
                  <td className="p-2">{l.failed > 0 && <button onClick={() => dl(l)} className="text-xs font-semibold text-primary">Failed rows</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
