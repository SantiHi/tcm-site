import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import type { AuthMode } from "@/lib/env";

export function Nav({ mode, signedIn }: { mode: AuthMode; signedIn: boolean }) {
  return (
    <header className="relative border-b border-line bg-white">
      <div className="container-site flex items-center justify-between h-20">
        <Logo href={signedIn ? "/" : "/login"} />
        <NavLinks mode={mode} signedIn={signedIn} />
      </div>
    </header>
  );
}
