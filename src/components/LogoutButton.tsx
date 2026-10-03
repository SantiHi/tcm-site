"use client";

import type { AuthMode } from "@/lib/env";
import { demoLogout } from "@/app/actions/auth";
import { ClerkLogoutButton } from "@/components/ClerkLogoutButton";

export function LogoutButton({ mode, className }: { mode: AuthMode; className?: string }) {
  if (mode === "clerk") return <ClerkLogoutButton className={className} />;
  return (
    <form action={demoLogout} className="flex">
      <button type="submit" className={className}>Log Out</button>
    </form>
  );
}
