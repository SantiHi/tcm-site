import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";

const publicLogo = path.join(process.cwd(), "public", "logo.png");
const rootLogo = path.join(process.cwd(), "logo.png");

// Convenience: if logo.png was dropped in the project root, copy it into
// public/ so Next can serve it. Runs once per server start.
if (!fs.existsSync(publicLogo) && fs.existsSync(rootLogo)) {
  try {
    fs.copyFileSync(rootLogo, publicLogo);
  } catch {
    /* ignore */
  }
}
const hasLogo = fs.existsSync(publicLogo);

export function Logo({ href = "/directory" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 shrink-0" aria-label={`${site.name} home`}>
      {hasLogo ? (
        <Image src="/logo.png" alt={site.name} width={160} height={48} priority className="h-10 w-auto" />
      ) : (
        <span className="font-heading font-bold text-ink text-lg tracking-tight">{site.name}</span>
      )}
    </Link>
  );
}
