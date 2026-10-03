import "server-only";
import { isDemoMode } from "@/lib/env";

/**
 * Low-level, server-only Airtable client. Every other Airtable module goes
 * through `airtableFetch`, so the token never leaves the server.
 * Only the Members and Events tables are ever named by the app.
 */

/** Overridable only for local testing against a mock server. */
const API_URL = (process.env.AIRTABLE_API_URL || "https://api.airtable.com/v0").replace(/\/$/, "");

export const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;

export class AirtableConfigError extends Error {}

export type AirtableRecord = { id: string; fields: Record<string, unknown> };

export function config() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const membersTable = process.env.AIRTABLE_TABLE_NAME;
  if (!token || !baseId || !membersTable) {
    throw new AirtableConfigError(
      "Airtable is not configured. Fill AIRTABLE_TOKEN, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME in .env.local.",
    );
  }
  if (isDemoMode() && process.env.VERCEL) {
    throw new Error("Demo login mode must never run on Vercel. Add Clerk keys first.");
  }
  return { token, baseId, membersTable };
}

type Query = Record<string, string | string[]>;

export async function airtableFetch<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { token } = config();
  const url = new URL(`${API_URL}/${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify((await res.json()).error);
    } catch {
      /* ignore */
    }
    throw new Error(`Airtable ${init.method ?? "GET"} ${path} failed: ${res.status} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Path to a table, relative to the API root. */
export function tablePath(tableName: string) {
  return `${config().baseId}/${encodeURIComponent(tableName)}`;
}

/** Fetch every record of a table, following pagination. */
export async function listAll(tableName: string, query: Query): Promise<AirtableRecord[]> {
  const out: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const data = await airtableFetch<{ records: AirtableRecord[]; offset?: string }>(tablePath(tableName), {
      query: offset ? { ...query, offset } : query,
    });
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

/** Escape a string for use inside a double-quoted Airtable formula literal. */
export function formulaString(s: string) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(str).join(", ");
  return String(v).trim();
}

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}
