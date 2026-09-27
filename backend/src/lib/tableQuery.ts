import type { Knex } from "knex";
import { db } from "../db/index.js";

/**
 * Reimplements the small subset of the supabase-js query builder that this
 * codebase actually uses (see src/lib/*.functions.ts and
 * src/components/admin/content-manager.tsx in the original project), so the
 * frontend can keep calling `db.from(table).select(...).eq(...).order(...)`
 * unchanged (see frontend/src/lib/db-client.ts) while this executes the
 * equivalent query against MySQL via Knex.
 */

export type FilterOp = "eq" | "neq" | "in" | "ilike" | "or" | "gte" | "lte" | "gt" | "lt";
export type Filter = { col: string; op: FilterOp; value: unknown };
export type OrderSpec = { col: string; ascending: boolean };

export type QuerySpec = {
  op: "select" | "insert" | "update" | "delete";
  columns?: string; // comma separated, or "*"
  count?: "exact"; // request a total row count alongside data
  head?: boolean; // count-only, no rows
  filters?: Filter[];
  order?: OrderSpec[];
  range?: [number, number]; // inclusive, like supabase .range(from, to)
  limit?: number;
  single?: "maybeSingle" | "single";
  values?: Record<string, unknown> | Record<string, unknown>[]; // insert/update payload
};

/** Columns that are JSON in MySQL and need JSON.stringify before writing. */
const JSON_COLUMNS = new Set(["tags", "images", "details", "aliases", "nearby", "failed_rows", "value"]);

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = JSON_COLUMNS.has(k) && v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  }
  return out;
}

/** Parses a single postgrest-style "or" filter, e.g.
 *  "location.ilike.%a%,details->>address.ilike.%a%" or
 *  "category.ilike.%hotel%,category.ilike.%lodge%,category.ilike.%resort%" */
function applyOrFilter(qb: Knex.QueryBuilder, raw: string) {
  const clauses = String(raw).split(",");
  qb.andWhere((inner) => {
    for (const clause of clauses) {
      const m = /^(.+?)\.(ilike|eq)\.(.*)$/.exec(clause);
      if (!m) continue;
      const [, colRaw, op, valRaw] = m as unknown as [string, string, "ilike" | "eq", string];
      const value = op === "ilike" ? valRaw.replace(/%/g, "%") : valRaw;
      if (colRaw.includes("->>")) {
        // details->>address  =>  JSON_UNQUOTE(JSON_EXTRACT(details, '$.address'))
        const [jsonCol, jsonKey] = colRaw.split("->>");
        const expr = `JSON_UNQUOTE(JSON_EXTRACT(??, ?))`;
        if (op === "ilike") inner.orWhereRaw(`${expr} LIKE ?`, [jsonCol, `$.${jsonKey}`, value]);
        else inner.orWhereRaw(`${expr} = ?`, [jsonCol, `$.${jsonKey}`, value]);
      } else {
        if (op === "ilike") inner.orWhere(colRaw, "like", value);
        else inner.orWhere(colRaw, "=", value);
      }
    }
  });
}

function applyFilters(qb: Knex.QueryBuilder, filters: Filter[] = []) {
  for (const f of filters) {
    if (f.op === "eq") qb.andWhere(f.col, "=", f.value as Knex.Value);
    else if (f.op === "neq") qb.andWhere(f.col, "!=", f.value as Knex.Value);
    else if (f.op === "in") qb.whereIn(f.col, f.value as Knex.Value[]);
    else if (f.op === "ilike") qb.andWhere(f.col, "like", f.value as Knex.Value);
    else if (f.op === "gte") qb.andWhere(f.col, ">=", f.value as Knex.Value);
    else if (f.op === "lte") qb.andWhere(f.col, "<=", f.value as Knex.Value);
    else if (f.op === "gt") qb.andWhere(f.col, ">", f.value as Knex.Value);
    else if (f.op === "lt") qb.andWhere(f.col, "<", f.value as Knex.Value);
    else if (f.op === "or") applyOrFilter(qb, f.value as string);
  }
}

export type QueryResult = { data: unknown; error: string | null; count: number | null };

export async function runTableQuery(table: string, spec: QuerySpec): Promise<QueryResult> {
  try {
    if (spec.op === "select") {
      const cols = spec.head ? [] : spec.columns && spec.columns !== "*" ? spec.columns.split(",").map((c) => c.trim()) : ["*"];
      let count: number | null = null;
      if (spec.count === "exact") {
        const cq = db(table).clone();
        applyFilters(cq, spec.filters);
        const row = await cq.count<{ c: number }[]>({ c: "*" }).first();
        count = Number(row?.["c"] ?? 0);
      }
      if (spec.head) return { data: [], error: null, count };
      let q = db(table).select(cols);
      applyFilters(q, spec.filters);
      for (const o of spec.order ?? []) q = q.orderBy(o.col, o.ascending ? "asc" : "desc");
      if (spec.range) q = q.offset(spec.range[0]).limit(spec.range[1] - spec.range[0] + 1);
      else if (spec.limit) q = q.limit(spec.limit);
      const rows = await q;
      if (spec.single === "maybeSingle") return { data: rows[0] ?? null, error: null, count };
      if (spec.single === "single") return { data: rows[0] ?? null, error: rows[0] ? null : "No rows found", count };
      return { data: rows, error: null, count };
    }

    if (spec.op === "insert") {
      const values = Array.isArray(spec.values) ? spec.values.map(serializeRow) : [serializeRow(spec.values ?? {})];
      await db(table).insert(values);
      return { data: values, error: null, count: values.length };
    }

    if (spec.op === "update") {
      const q = db(table);
      applyFilters(q, spec.filters);
      const affected = await q.update(serializeRow(spec.values as Record<string, unknown>));
      return { data: null, error: null, count: affected };
    }

    if (spec.op === "delete") {
      const q = db(table);
      applyFilters(q, spec.filters);
      const affected = await q.del();
      return { data: null, error: null, count: affected };
    }

    return { data: null, error: "Unsupported operation", count: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err), count: null };
  }
}
