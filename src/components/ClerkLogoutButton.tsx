"use client";

import { useClerk } from "@clerk/nextjs";

/** Rendered only inside ClerkProvider (Clerk mode). */
export function ClerkLogoutButton({ className }: { className?: string }) {
  const { signOut } = useClerk();
  return (
    <button type="button" className={className} onClick={() => signOut({ redirectUrl: "/login" })}>
      Log Out
    </button>
  );
}
