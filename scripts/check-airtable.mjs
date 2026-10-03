#!/usr/bin/env node
/**
 * Reads the Airtable base schema and reports what the portal will use.
 * Run: npm run airtable:check
 *
 * Reads ONLY schema (table + column names). Never fetches records from any
 * table other than the configured Members table, and never touches
 * "Magic Links".
 */
import { readFileSync, existsSync } from "node:fs";

// Minimal .env.local loader (no dependency).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { AIRTABLE_TOKEN: token, AIRTABLE_BASE_ID: baseId, AIRTABLE_TABLE_NAME: table } = process.env;
if (!token || !baseId || !table) {
  console.error("Missing AIRTABLE_TOKEN, AIRTABLE_BASE_ID or AIRTABLE_TABLE_NAME in .env.local");
  process.exit(1);
}

const REQUIRED = ["Name", "Class Year", "email", "firm"];
const OPTIONAL = ["LinkedIn URL", "Show in directory"];
const PRIVATE_HINTS = /phone|mobile|address|personal|home|birth|dob|ssn|salary|note|link/i;

const headers = { Authorization: `Bearer ${token}` };
const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, { headers });

if (!res.ok) {
  console.error(`Meta API failed (${res.status}).`);
  if (res.status === 403) {
    console.error("Your token needs the 'schema.bases:read' scope to list columns. Add it at https://airtable.com/create/tokens");
    console.error("The app itself still works without it (it falls back to sampling records).");
  }
  process.exit(1);
}

const { tables } = await res.json();
console.log(`Base ${baseId}: ${tables.length} table(s)\n`);

for (const t of tables) {
  const isMembers = t.name.toLowerCase() === table.toLowerCase();
  const isMagic = /magic\s*link/i.test(t.name);
  if (isMagic) {
    console.log(`• ${t.name}  (login system table: not read, not modified, not used by the portal)`);
    continue;
  }
  console.log(`• ${t.name}${isMembers ? "  <-- Members table used by the portal" : ""}`);
  if (!isMembers) {
    console.log(`    ${t.fields.length} column(s), not used by the portal`);
    continue;
  }
  const names = t.fields.map((f) => f.name);
  const find = (w) => names.find((n) => n.trim().toLowerCase() === w.toLowerCase());
  for (const f of t.fields) {
    const lower = f.name.trim().toLowerCase();
    let tag;
    if (["name", "class year", "firm"].includes(lower)) tag = "PUBLIC (directory)";
    else if (lower === "linkedin url") tag = "PUBLIC (directory, optional)";
    else if (lower === "show in directory") tag = "CONTROL (visibility toggle)";
    else if (lower === "email") tag = "PRIVATE (login only, never sent to directory)";
    else tag = PRIVATE_HINTS.test(f.name) ? "PRIVATE (never sent)" : "UNUSED (never sent)";
    console.log(`    - ${f.name} [${f.type}]  ${tag}`);
  }
  console.log("");
  const missingReq = REQUIRED.filter((r) => !find(r));
  const missingOpt = OPTIONAL.filter((o) => !find(o));
  if (missingReq.length) console.log(`  MISSING required columns: ${missingReq.join(", ")}  -> the app will not work until these exist.`);
  else console.log("  Required columns: all present.");
  if (missingOpt.length) {
    console.log(`  Optional columns not found: ${missingOpt.join(", ")}`);
    if (missingOpt.includes("LinkedIn URL")) console.log("    -> Add a 'LinkedIn URL' column (type: URL) to let members share LinkedIn.");
    if (missingOpt.includes("Show in directory")) console.log("    -> Add a 'Show in directory' column (type: Checkbox). Until it exists, everyone is listed.");
    console.log("    The app detects these automatically; no code change needed.");
  } else {
    console.log("  Optional columns: LinkedIn URL and Show in directory both present.");
  }
}
