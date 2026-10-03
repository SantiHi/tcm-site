import { ClerkProvider } from "@clerk/nextjs";
import type { AuthMode } from "@/lib/env";

/**
 * Mounts ClerkProvider only when Clerk keys exist. In demo mode the tree is
 * rendered bare, so no Clerk script ever loads.
 */
export function AuthProvider({ mode, children }: { mode: AuthMode; children: React.ReactNode }) {
  if (mode === "demo") return <>{children}</>;
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      signInFallbackRedirectUrl="/directory"
      signUpFallbackRedirectUrl="/directory"
      afterSignOutUrl="/login"
    >
      {children}
    </ClerkProvider>
  );
}
