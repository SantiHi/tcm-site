"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MemberPublic } from "@/lib/airtable";

export function DirectoryClient({ members }: { members: MemberPublic[] }) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [firm, setFirm] = useState("");
  const [location, setLocation] = useState("");

  const years = useMemo(
    () => [...new Set(members.map((m) => m.classYear).filter(Boolean))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    [members],
  );
  const firms = useMemo(
    () => [...new Set(members.map((m) => m.firm).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const locations = useMemo(
    () => [...new Set(members.map((m) => m.location ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (year && m.classYear !== year) return false;
      if (firm && m.firm !== firm) return false;
      if (location && (m.location ?? "") !== location) return false;
      if (!needle) return true;
      return [m.name, m.classYear, m.firm, m.location ?? ""].some((v) => v.toLowerCase().includes(needle));
    });
  }, [members, q, year, firm, location]);

  const hasFilters = q || year || firm || location;
  const showLocation = locations.length > 0;

  return (
    <>
      <div className="card mb-8">
        <div className={`grid grid-cols-1 gap-4 ${showLocation ? "md:grid-cols-2 lg:grid-cols-[1fr_160px_220px_200px]" : "md:grid-cols-[1fr_200px_240px]"}`}>
          <div className={showLocation ? "md:col-span-2 lg:col-span-1" : ""}>
            <label htmlFor="q" className="label">Search</label>
            <input id="q" type="search" className="input" placeholder={showLocation ? "Name, class year, firm, or location" : "Name, class year, or firm"} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label htmlFor="year" className="label">Class Year</label>
            <select id="year" className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="firm" className="label">Firm</label>
            <select id="firm" className="input" value={firm} onChange={(e) => setFirm(e.target.value)}>
              <option value="">All firms</option>
              {firms.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {showLocation && (
            <div>
              <label htmlFor="location" className="label">Location</label>
              <select id="location" className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">All locations</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-body">
          <span>{results.length} of {members.length} alumni</span>
          {hasFilters && (
            <button type="button" className="link" onClick={() => { setQ(""); setYear(""); setFirm(""); setLocation(""); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="text-center text-body py-16">No alumni match your search.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((m) => (
            <li key={m.id}>
              <Link href={`/directory/${m.id}`} className="card block h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg leading-snug">{m.name}</h2>
                  {m.linkedinUrl && (
                    <span className="shrink-0 mt-0.5 text-body" title="LinkedIn profile" aria-label="Has LinkedIn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" /></svg>
                    </span>
                  )}
                </div>
                <p className="text-sm text-body mt-1">{m.classYear ? `Class of ${m.classYear}` : "\u00a0"}</p>
                <p className="text-sm text-ink mt-3">{m.firm || <span className="text-body">Firm not listed</span>}</p>
                {m.location && <p className="text-sm text-body mt-1">{m.location}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
