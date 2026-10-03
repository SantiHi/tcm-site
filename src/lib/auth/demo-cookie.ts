import "server-only";

/**
 * Demo-mode session cookie: `<base64url(email)>.<hmac-sha256>`.
 * Uses Web Crypto so it works in both the Node runtime (server actions)
 * and the edge runtime (proxy). Local demo only; never used with Clerk.
 */

export const DEMO_COOKIE = "tcm_demo_session";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  const secret = process.env.AIRTABLE_TOKEN;
  if (!secret) throw new Error("AIRTABLE_TOKEN is required to sign demo sessions.");
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`tcm-demo-session:${secret}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signDemoSession(email: string): Promise<string> {
  const payload = b64url(enc.encode(email));
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyDemoSession(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    return new TextDecoder().decode(fromB64url(payload));
  } catch {
    return null;
  }
}
