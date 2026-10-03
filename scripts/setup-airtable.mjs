#!/usr/bin/env node
/**
 * Idempotent, additive Airtable setup for the portal. Run: npm run airtable:setup
 *
 *  - Members: adds "Location" (text) and "Show in directory" (checkbox) if missing.
 *    When "Show in directory" is created, it is ticked for every member that has
 *    a Name, so nobody disappears from the directory.
 *  - Creates the "Events" table if missing.
 *
 * Never touches "Magic Links". Never deletes or renames anything.
 * Needs token scopes: schema.bases:read, schema.bases:write, data.records:read, data.records:write.
 */
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const { AIRTABLE_TOKEN: token, AIRTABLE_BASE_ID: baseId, AIRTABLE_TABLE_NAME: membersName = "Members" } = process.env;
if (!token || !baseId) { console.error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID"); process.exit(1); }

const API = "https://api.airtable.com/v0";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function call(method, path, body) {
  const res = await fetch(`${API}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json;
}

const meta = await call("GET", `meta/bases/${baseId}/tables`);
const members = meta.tables.find((t) => t.name.toLowerCase() === membersName.toLowerCase());
if (!members) { console.error(`Table "${membersName}" not found`); process.exit(1); }
const hasField = (t, name) => t.fields.some((f) => f.name.trim().toLowerCase() === name.toLowerCase());

// ---- Members columns ----
if (!hasField(members, "Location")) {
  await call("POST", `meta/bases/${baseId}/tables/${members.id}/fields`, { name: "Location", type: "singleLineText", description: "City or region shown in the alumni directory" });
  console.log("Members: created column 'Location'");
} else console.log("Members: 'Location' already exists");

let createdShow = false;
if (!hasField(members, "Show in directory")) {
  await call("POST", `meta/bases/${baseId}/tables/${members.id}/fields`, { name: "Show in directory", type: "checkbox", options: { icon: "check", color: "greenBright" }, description: "Unchecked members are hidden from the alumni directory" });
  console.log("Members: created column 'Show in directory'");
  createdShow = true;
} else console.log("Members: 'Show in directory' already exists");

if (createdShow) {
  const nameField = members.fields.find((f) => f.name.trim().toLowerCase() === "name")?.name ?? "Name";
  const recs = []; let offset;
  do {
    const u = new URL(`${API}/${baseId}/${encodeURIComponent(members.name)}`);
    u.searchParams.set("fields[]", nameField); if (offset) u.searchParams.set("offset", offset);
    const j = await (await fetch(u, { headers })).json(); recs.push(...j.records); offset = j.offset;
  } while (offset);
  const named = recs.filter((r) => String(r.fields[nameField] ?? "").trim());
  for (let i = 0; i < named.length; i += 10) {
    await call("PATCH", `${baseId}/${encodeURIComponent(members.name)}`, { records: named.slice(i, i + 10).map((r) => ({ id: r.id, fields: { "Show in directory": true } })) });
  }
  console.log(`Members: ticked 'Show in directory' for ${named.length} named member(s); ${recs.length - named.length} blank row(s) left unticked`);
}

// ---- Events table ----
const EVENT_TYPES = ["Social", "Networking", "Panel / Talk", "Reunion", "Recruiting", "Other"];
const RSVP_FIELDS = [
  { name: "Going", type: "multilineText", description: "PRIVATE: one email per line, members who RSVP'd going" },
  { name: "Maybe", type: "multilineText", description: "PRIVATE: one email per line, members who RSVP'd maybe" },
  { name: "Capacity", type: "number", options: { precision: 0 }, description: "Optional max number of 'going' RSVPs" },
  { name: "Type", type: "singleSelect", options: { choices: EVENT_TYPES.map((name) => ({ name })) } },
  { name: "Image", type: "multipleAttachments", description: "Optional banner image shown on the event card and page. Uploaded from the portal (JPEG/PNG/WebP, max 4 MB)." },
];
const events = meta.tables.find((t) => t.name.toLowerCase() === "events");
if (!events) {
  await call("POST", `meta/bases/${baseId}/tables`, {
    name: "Events",
    description: "Alumni events posted from the member portal",
    fields: [
      { name: "Title", type: "singleLineText" },
      { name: "Start", type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "12hour" }, timeZone: "America/New_York" } },
      { name: "End", type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "12hour" }, timeZone: "America/New_York" } },
      { name: "Location", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Link", type: "url" },
      { name: "Posted By", type: "singleLineText", description: "Display name of the member who posted" },
      { name: "Posted By Email", type: "email", description: "PRIVATE: used to verify who may edit or delete" },
      { name: "Reminder Emails", type: "multilineText", description: "PRIVATE: one email per line, members who asked for a reminder" },
      { name: "Reminder Sent", type: "checkbox", options: { icon: "check", color: "greenBright" } },
      { name: "Cancelled", type: "checkbox", options: { icon: "xCheckbox", color: "redBright" } },
      ...RSVP_FIELDS,
    ],
  });
  console.log("Created table 'Events' (with RSVP columns)");
} else {
  console.log("'Events' table already exists");
  for (const f of ["Title","Start","End","Location","Description","Link","Posted By","Posted By Email","Reminder Emails","Reminder Sent","Cancelled"]) if (!hasField(events, f)) console.log(`  WARNING: Events is missing column '${f}'`);
  for (const f of RSVP_FIELDS) {
    if (hasField(events, f.name)) { console.log(`Events: '${f.name}' already exists`); continue; }
    await call("POST", `meta/bases/${baseId}/tables/${events.id}/fields`, f);
    console.log(`Events: created column '${f.name}'`);
  }
}
console.log("Done. Restart the dev server so it picks up the new columns.");
