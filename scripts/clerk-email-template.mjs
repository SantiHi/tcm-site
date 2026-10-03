#!/usr/bin/env node
/**
 * Applies the branded sign-in code email to Clerk. Run: npm run clerk:email-template
 *
 * Uses CLERK_SECRET_KEY from .env.local. Requires custom email templates to be
 * enabled on the Clerk instance (a paid Clerk plan feature). Until then this
 * prints "feature_not_enabled"; the same HTML can be pasted into
 * Clerk Dashboard → Customization → Emails → Verification code.
 *
 * Add --preview to only render the template through Clerk and save preview.html.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const key = process.env.CLERK_SECRET_KEY;
if (!key) { console.error("CLERK_SECRET_KEY is not set in .env.local"); process.exit(1); }

const body = readFileSync("emails/clerk-verification-code.html", "utf8");
const subject = "{{otp_code}} is your Tiger Capital Management sign-in code";
const preview = process.argv.includes("--preview");
const url = `https://api.clerk.com/v1/templates/email/verification_code${preview ? "/preview" : ""}`;
const payload = preview
  ? { subject, body, from_email_name: "alumni" }
  : { name: "Verification code", subject, body, markup: "", from_email_name: "alumni" };

// curl instead of fetch: Clerk's edge blocks some non-browser user agents.
const out = execFileSync("curl", ["-s", "-X", preview ? "POST" : "PUT", url, "-H", `Authorization: Bearer ${key}`, "-H", "Content-Type: application/json", "--data-binary", JSON.stringify(payload)], { encoding: "utf8", maxBuffer: 10_000_000 });
let json;
try { json = JSON.parse(out); } catch { console.error("Unexpected response:", out.slice(0, 300)); process.exit(1); }
if (json.errors) { console.error("Clerk error:", json.errors.map((e) => `${e.code}: ${e.long_message ?? e.message}`).join("; ")); process.exit(1); }
if (preview) { writeFileSync("preview.html", json.body ?? ""); console.log("Preview saved to preview.html (subject:", json.subject + ")"); }
else console.log("Template applied:", json.subject, "from", json.from_email_name ?? "(default)");
