import "server-only";
import { airtableFetch, config, formulaString, listAll, normalizeEmail, RECORD_ID_RE, str, tablePath, type AirtableRecord } from "@/lib/airtable/client";
import { getSchema, type Schema } from "@/lib/airtable/schema";

/**
 * Members table access.
 *
 *  - Directory reads return a fixed whitelist of public fields. Email and
 *    every other column never leave this module for the directory.
 *  - Records with no Name are treated as blank rows and never listed.
 *  - Writes are keyed by the caller's verified email, never by a record ID
 *    supplied from the browser.
 */

/** What the directory and public profile pages are allowed to see. Nothing else. */
export type MemberPublic = {
  id: string;
  name: string;
  classYear: string;
  firm: string;
  location: string | null;
  linkedinUrl: string | null;
};

/** What a member sees about their own record. Never sent to other members. */
export type MemberSelf = MemberPublic & {
  email: string;
  showInDirectory: boolean | null; // null when the column doesn't exist
};

function toPublic(r: AirtableRecord, s: Schema): MemberPublic {
  const c = s.members;
  return {
    id: r.id,
    name: str(r.fields[c.name]),
    classYear: str(r.fields[c.classYear]),
    firm: str(r.fields[c.firm]),
    location: c.location ? str(r.fields[c.location]) || null : null,
    linkedinUrl: c.linkedinUrl ? normalizeLinkedIn(str(r.fields[c.linkedinUrl])) : null,
  };
}

function toSelf(r: AirtableRecord, s: Schema): MemberSelf {
  const c = s.members;
  return {
    ...toPublic(r, s),
    email: normalizeEmail(r.fields[c.email]),
    showInDirectory: c.showInDirectory ? Boolean(r.fields[c.showInDirectory]) : null,
  };
}

function hasName(r: AirtableRecord, s: Schema) {
  return str(r.fields[s.members.name]).length > 0;
}

function isVisible(r: AirtableRecord, s: Schema): boolean {
  if (!hasName(r, s)) return false;
  const col = s.members.showInDirectory;
  return col ? Boolean(r.fields[col]) : true;
}

function publicFieldList(s: Schema): string[] {
  const c = s.members;
  const list = [c.name, c.classYear, c.firm];
  if (c.location) list.push(c.location);
  if (c.linkedinUrl) list.push(c.linkedinUrl);
  if (c.showInDirectory) list.push(c.showInDirectory);
  return list;
}

/** Stored LinkedIn values may lack a scheme; present them as full URLs. */
function normalizeLinkedIn(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function findRecordByEmail(email: string): Promise<AirtableRecord | null> {
  const s = await getSchema();
  const norm = normalizeEmail(email);
  if (!norm) return null;
  const formula = `LOWER(TRIM({${s.members.email}}))=${formulaString(norm)}`;
  const data = await airtableFetch<{ records: AirtableRecord[] }>(tablePath(config().membersTable), {
    query: { filterByFormula: formula, maxRecords: "1" },
  });
  return data.records[0] ?? null;
}

/** Login gate: returns the member's own view if the email is registered. */
export async function findMemberByEmail(email: string): Promise<MemberSelf | null> {
  const r = await findRecordByEmail(email);
  return r ? toSelf(r, await getSchema()) : null;
}

/** Directory list: public fields only, blank rows and hidden members excluded. */
export async function listDirectory(): Promise<MemberPublic[]> {
  const s = await getSchema();
  const query: Record<string, string | string[]> = {
    "fields[]": publicFieldList(s),
    pageSize: "100",
    "sort[0][field]": s.members.name,
    "sort[0][direction]": "asc",
  };
  const parts = [`{${s.members.name}}!=""`];
  if (s.members.showInDirectory) parts.push(`{${s.members.showInDirectory}}=TRUE()`);
  query.filterByFormula = parts.length > 1 ? `AND(${parts.join(",")})` : parts[0];

  const records = await listAll(config().membersTable, query);
  return records.filter((r) => isVisible(r, s)).map((r) => toPublic(r, s));
}

/** Single public profile. Returns null if unknown, blank, or hidden from the directory. */
export async function getDirectoryMember(id: string): Promise<MemberPublic | null> {
  if (!RECORD_ID_RE.test(id)) return null;
  const s = await getSchema();
  try {
    // The single-record endpoint doesn't accept a field list; the whitelist
    // is applied by toPublic(), which copies only public columns.
    const r = await airtableFetch<AirtableRecord>(`${tablePath(config().membersTable)}/${id}`);
    return isVisible(r, s) ? toPublic(r, s) : null;
  } catch (err) {
    console.warn("[airtable] getDirectoryMember failed:", (err as Error).message);
    return null;
  }
}

export type ProfilePatch = {
  firm?: string;
  location?: string;
  linkedinUrl?: string | null;
  showInDirectory?: boolean;
};

/**
 * Update the caller's own record. `email` must come from the verified
 * session, never from the request body. Only whitelisted columns are written.
 */
export async function updateMemberByEmail(email: string, patch: ProfilePatch): Promise<MemberSelf> {
  const s = await getSchema();
  const existing = await findRecordByEmail(email);
  if (!existing) throw new Error("Member record not found for the current session.");

  const c = s.members;
  const fieldsToWrite: Record<string, unknown> = {};
  if (patch.firm !== undefined) fieldsToWrite[c.firm] = patch.firm;
  if (patch.location !== undefined && c.location) fieldsToWrite[c.location] = patch.location;
  if (patch.linkedinUrl !== undefined && c.linkedinUrl) fieldsToWrite[c.linkedinUrl] = patch.linkedinUrl ?? "";
  if (patch.showInDirectory !== undefined && c.showInDirectory) fieldsToWrite[c.showInDirectory] = patch.showInDirectory;

  const updated = await airtableFetch<AirtableRecord>(`${tablePath(config().membersTable)}/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: fieldsToWrite, typecast: false }),
  });
  return toSelf(updated, s);
}

/** Server-only: resolves emails to display names for attendee lists. Cached briefly. */
export type MemberLookup = Map<string, { name: string; id: string; visible: boolean }>;
let lookupCache: { value: MemberLookup; at: number } | null = null;

export async function getMemberLookup(): Promise<MemberLookup> {
  if (lookupCache && Date.now() - lookupCache.at < 60 * 1000) return lookupCache.value;
  const s = await getSchema();
  const c = s.members;
  const fields = [c.name, c.email];
  if (c.showInDirectory) fields.push(c.showInDirectory);
  const records = await listAll(config().membersTable, { "fields[]": fields, pageSize: "100", filterByFormula: `{${c.name}}!=""` });
  const map: MemberLookup = new Map();
  for (const r of records) {
    const email = normalizeEmail(r.fields[c.email]);
    if (!email) continue;
    map.set(email, { name: str(r.fields[c.name]), id: r.id, visible: isVisible(r, s) });
  }
  lookupCache = { value: map, at: Date.now() };
  return map;
}
