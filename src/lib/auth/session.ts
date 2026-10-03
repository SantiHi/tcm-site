import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authMode } from "@/lib/env";
import { findMemberByEmail, normalizeEmail, type MemberSelf } from "@/lib/airtable";
import { DEMO_COOKIE, verifyDemoSession } from "@/lib/auth/demo-cookie";

/**
 * One interface for "who is logged in", with two backends:
 *  - demo: signed local cookie (no Clerk keys)
 *  - clerk: Clerk session, email taken from the Clerk user
 * Pages call `requireMember()` and never care which one is active.
 */

export async function getSessionEmail(): Promise<string | null> {
  if (authMode() === "demo") {
    const store = await cookies();
    try {
      return await verifyDemoSession(store.get(DEMO_COOKIE)?.value);
    } catch {
      return null; // e.g. AIRTABLE_TOKEN not set yet: treat as signed out
    }
  }
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  return email ? normalizeEmail(email) : null;
}

/** Lightweight check for layouts: is anyone logged in at all? */
export async function isSignedIn(): Promise<boolean> {
  return (await getSessionEmail()) !== null;
}

/**
 * Resolve the logged-in member from Airtable. Redirects to /login when there
 * is no session and to /not-registered when the email isn't in the table.
 */
export async function requireMember(): Promise<MemberSelf> {
  const email = await getSessionEmail();
  if (!email) redirect("/login");
  const member = await findMemberByEmail(email);
  if (!member) redirect("/not-registered");
  return member;
}
