import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory rate limiter for login attempts, keyed by client IP.
 * Slows down email-enumeration and code-guessing from a single source.
 * State is per server instance (fine for Vercel functions; a shared store
 * such as Upstash can replace it later without touching callers).
 */
const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map<string, { count: number; resetAt: number }>();

async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "unknown";
}

/** Returns true when the caller is allowed; false when over the limit. */
export async function allow(scope: string, limit: number): Promise<boolean> {
  const key = `${scope}:${await clientKey()}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}
