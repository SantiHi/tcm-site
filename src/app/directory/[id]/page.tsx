import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { getDirectoryMember } from "@/lib/airtable";

export const metadata: Metadata = { title: "Profile" };

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const member = await getDirectoryMember(id); // public fields only, hidden members 404
  if (!member) notFound();

  const initials = member.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="container-site py-12 sm:py-16">
      <Link href="/directory" className="nav-link inline-flex items-center gap-2 mb-8">
        <span aria-hidden="true">&larr;</span> Directory
      </Link>

      <div className="card max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand/10 font-heading text-2xl font-bold text-brand">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight">{member.name || "Unnamed member"}</h1>
            <p className="text-body mt-1">
              {[member.classYear && `Class of ${member.classYear}`, member.firm, member.location].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-8">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body">Class Year</dt>
            <dd className="mt-1 text-ink">{member.classYear || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body">Firm</dt>
            <dd className="mt-1 text-ink">{member.firm || "—"}</dd>
          </div>
          {member.location && (
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body">Location</dt>
              <dd className="mt-1 text-ink">{member.location}</dd>
            </div>
          )}
          {member.linkedinUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body">LinkedIn</dt>
              <dd className="mt-2">
                <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  View LinkedIn
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
