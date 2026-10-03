/**
 * Environment helpers. Safe for server, proxy (edge) and client bundles:
 * it only ever reads NEXT_PUBLIC_* on the client, and the secret checks
 * below are tree-shaken out of client code because they are never called there.
 */

/** True when Clerk keys are configured. */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

/** Demo login mode: no Clerk keys. Any 6-digit code works. Localhost only. */
export function isDemoMode(): boolean {
  return !isClerkConfigured();
}

export type AuthMode = "demo" | "clerk";

export function authMode(): AuthMode {
  return isDemoMode() ? "demo" : "clerk";
}

/** Hostnames demo mode is allowed to serve. */
export function isLocalHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}
