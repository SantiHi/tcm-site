import "server-only";
import { eventsTable, fields } from "@/config/site";
import { airtableFetch, config, listAll, type AirtableRecord } from "@/lib/airtable/client";

/**
 * Runtime schema detection. Column names are matched case-insensitively
 * against the candidate lists in `src/config/site.ts`. Optional columns and
 * the Events table switch features on when present.
 */

export type MemberColumns = {
  name: string;
  classYear: string;
  email: string;
  firm: string;
  linkedinUrl: string | null;
  showInDirectory: string | null;
  location: string | null;
};

export type EventColumns = Record<keyof typeof eventsTable.required, string> &
  Record<keyof typeof eventsTable.optional, string | null>;

export type Schema = {
  members: MemberColumns;
  /** Present only when the Events table exists with all expected columns. */
  events: { table: string; columns: EventColumns; missing: string[] } | null;
  source: "meta-api" | "record-sample";
  missingRequired: string[];
};

let cache: { value: Schema; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

type MetaTable = { name: string; fields: { name: string }[] };

async function loadTables(): Promise<{ tables: MetaTable[]; source: Schema["source"] }> {
  const { baseId, membersTable } = config();
  try {
    const meta = await airtableFetch<{ tables: MetaTable[] }>(`meta/bases/${baseId}/tables`);
    return { tables: meta.tables, source: "meta-api" };
  } catch (err) {
    console.warn("[airtable] Meta API unavailable, sampling records instead:", (err as Error).message);
    const tables: MetaTable[] = [];
    const sample = await listAll(membersTable, { maxRecords: "100" });
    tables.push({ name: membersTable, fields: unionFields(sample) });
    try {
      const ev = await listAll(eventsTable.name, { maxRecords: "50" });
      tables.push({ name: eventsTable.name, fields: unionFields(ev) });
    } catch {
      /* no events table */
    }
    return { tables, source: "record-sample" };
  }
}

function unionFields(records: AirtableRecord[]) {
  const set = new Set<string>();
  for (const r of records) Object.keys(r.fields).forEach((k) => set.add(k));
  return [...set].map((name) => ({ name }));
}

function matcher(table: MetaTable | undefined) {
  const names = table?.fields.map((f) => f.name) ?? [];
  return (candidates: readonly string[]) => {
    for (const c of candidates) {
      const hit = names.find((n) => n.trim().toLowerCase() === c.toLowerCase());
      if (hit) return hit;
    }
    return null;
  };
}

export async function getSchema(force = false): Promise<Schema> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const { membersTable } = config();
  const { tables, source } = await loadTables();
  const membersMeta = tables.find((t) => t.name.toLowerCase() === membersTable.toLowerCase());
  if (!membersMeta) throw new Error(`Table "${membersTable}" not found in base`);

  const find = matcher(membersMeta);
  const missingRequired: string[] = [];
  const req = (cands: readonly string[]) => {
    const hit = find(cands);
    if (!hit) missingRequired.push(cands[0]);
    return hit ?? cands[0];
  };

  const members: MemberColumns = {
    name: req(fields.required.name),
    classYear: req(fields.required.classYear),
    email: req(fields.required.email),
    firm: req(fields.required.firm),
    linkedinUrl: find(fields.optional.linkedinUrl),
    showInDirectory: find(fields.optional.showInDirectory),
    location: find(fields.optional.location),
  };

  let events: Schema["events"] = null;
  const eventsMeta = tables.find((t) => t.name.toLowerCase() === eventsTable.name.toLowerCase());
  if (eventsMeta) {
    const findEv = matcher(eventsMeta);
    const columns = {} as EventColumns;
    const missing: string[] = [];
    for (const [key, name] of Object.entries(eventsTable.required) as [keyof typeof eventsTable.required, string][]) {
      const hit = findEv([name]);
      if (!hit) missing.push(name);
      columns[key] = hit ?? name;
    }
    for (const [key, name] of Object.entries(eventsTable.optional) as [keyof typeof eventsTable.optional, string][]) {
      columns[key] = findEv([name]);
    }
    events = { table: eventsMeta.name, columns, missing };
  }

  const value: Schema = { members, events, source, missingRequired };
  cache = { value, at: Date.now() };
  return value;
}

/** Feature flags derived from the schema. Safe to pass to client components. */
export type Features = {
  linkedinUrl: boolean;
  showInDirectory: boolean;
  location: boolean;
  events: boolean;
  rsvp: boolean;
  capacity: boolean;
  eventTypes: boolean;
  eventImages: boolean;
};

export async function getFeatures(): Promise<Features> {
  const s = await getSchema();
  return {
    linkedinUrl: s.members.linkedinUrl !== null,
    showInDirectory: s.members.showInDirectory !== null,
    location: s.members.location !== null,
    events: s.events !== null && s.events.missing.length === 0,
    rsvp: Boolean(s.events?.columns.going && s.events?.columns.maybe),
    capacity: Boolean(s.events?.columns.capacity),
    eventTypes: Boolean(s.events?.columns.type),
    eventImages: Boolean(s.events?.columns.image),
  };
}
