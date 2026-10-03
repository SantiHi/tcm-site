import type { Metadata } from "next";
import Link from "next/link";
import { authMode } from "@/lib/env";
import { LogoutButton } from "@/components/LogoutButton";
import { NotRegistered, LoginHeading, LoginShell } from "@/components/LoginCard";
import { getSessionEmail } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Not registered" };

/**
 * Shown when someone has a valid session (Clerk or demo) but their email is
 * not in the Airtable alumni table.
 */
export default async function NotRegisteredPage() {
  const email = await getSessionEmail();
  return (
    <LoginShell>
      <LoginHeading title="Member Access" text="" />
      <NotRegistered email={email ?? undefined} />
      <div className="mt-6 flex flex-col items-center gap-3 text-sm">
        <LogoutButton mode={authMode()} className="link" />
        <Link href="/login" className="link">Back to login</Link>
      </div>
    </LoginShell>
  );
}
