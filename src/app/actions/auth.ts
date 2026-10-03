"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isClerkConfigured, isDemoMode } from "@/lib/env";
import { AirtableConfigError, findMemberByEmail, normalizeEmail } from "@/lib/airtable";
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, signDemoSession } from "@/lib/auth/demo-cookie";
import { allow } from "@/lib/throttle";

export type AuthResult =
  | { status: "ok"; email: string }
  | { status: "not-registered" }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registration gate shared by both login modes. The browser only learns
 * "registered or not"; no record data is returned.
 */
export async function checkRegistered(rawEmail: string): Promise<AuthResult> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (!(await allow("login", 60))) return { status: "error", message: "Too many attempts. Please wait a few minutes and try again." };
  try {
    const member = await findMemberByEmail(email);
    return member ? { status: "ok", email } : { status: "not-registered" };
  } catch (err) {
    console.error("[auth] registration check failed:", err);
    if (err instanceof AirtableConfigError && isDemoMode()) {
      return { status: "error", message: "Airtable isn't configured yet. Fill in AIRTABLE_TOKEN, AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME in .env.local, then restart the dev server." };
    }
    return { status: "error", message: "We couldn't reach the member list. Please try again in a moment." };
  }
}

/**
 * Clerk mode step 1. Verifies the email is a registered member, then makes
 * sure a Clerk user exists for it (created server-side, so members never go
 * through a browser sign-up flow and no one else can create an account).
 * The client then simply requests an email code for that address.
 */
export async function prepareClerkSignIn(rawEmail: string): Promise<AuthResult> {
  if (!isClerkConfigured()) return { status: "error", message: "Email verification is not configured." };
  const gate = await checkRegistered(rawEmail);
  if (gate.status !== "ok") return gate;
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const existing = await client.users.getUserList({ emailAddress: [gate.email], limit: 1 });
    if (existing.data.length === 0) {
      const member = await findMemberByEmail(gate.email);
      const [firstName, ...rest] = (member?.name ?? "").split(/\s+/).filter(Boolean);
      await client.users.createUser({
        emailAddress: [gate.email],
        firstName: firstName || undefined,
        lastName: rest.length ? rest.join(" ") : undefined,
        skipPasswordRequirement: true,
      });
    }
    return gate;
  } catch (err) {
    console.error("[auth] Clerk user provisioning failed:", err);
    return { status: "error", message: "We couldn't start verification. Please try again in a moment." };
  }
}

/** Demo mode step 1: pretend to send a code. Only works for registered emails. */
export async function demoRequestCode(rawEmail: string): Promise<AuthResult> {
  if (!isDemoMode()) return { status: "error", message: "Demo login is disabled." };
  return checkRegistered(rawEmail);
}

/** Demo mode step 2: any 6-digit code works. Email is re-verified server-side. */
export async function demoVerifyCode(rawEmail: string, code: string): Promise<AuthResult> {
  if (!isDemoMode()) return { status: "error", message: "Demo login is disabled." };
  if (!/^\d{6}$/.test(code.trim())) return { status: "error", message: "Enter the 6-digit code." };
  if (!(await allow("verify", 60))) return { status: "error", message: "Too many attempts. Please wait a few minutes and try again." };
  const gate = await checkRegistered(rawEmail);
  if (gate.status !== "ok") return gate;

  const store = await cookies();
  store.set(DEMO_COOKIE, await signDemoSession(gate.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost only by design
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });
  return gate;
}

/** Demo mode log out. */
export async function demoLogout(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  redirect("/login");
}
