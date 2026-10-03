"use client";

import Link from "next/link";
import { useState } from "react";
import { site } from "@/config/site";
import type { AuthMode } from "@/lib/env";
import { LogoutButton } from "@/components/LogoutButton";

export function NavLinks({ mode, signedIn }: { mode: AuthMode; signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  const items = (
    <>
      {signedIn && (
        <>
          <Link href="/" className="nav-link md:hidden" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/directory" className="nav-link" onClick={() => setOpen(false)}>Directory</Link>
          <Link href="/events" className="nav-link" onClick={() => setOpen(false)}>Events</Link>
          <Link href="/profile" className="nav-link" onClick={() => setOpen(false)}>My Profile</Link>
          <LogoutButton mode={mode} className="nav-link" />
        </>
      )}
      <a href={site.mainSiteUrl} className="nav-link" target="_blank" rel="noopener noreferrer">
        Main Site
      </a>
    </>
  );

  return (
    <>
      <nav className="hidden md:flex items-center gap-8">{items}</nav>

      <button
        type="button"
        className="md:hidden p-2 -mr-2 text-ink"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav className="md:hidden absolute left-0 right-0 top-full z-20 bg-white border-b border-line shadow-card">
          <div className="container-site flex flex-col gap-5 py-6">{items}</div>
        </nav>
      )}
    </>
  );
}
