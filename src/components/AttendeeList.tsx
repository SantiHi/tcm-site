import Link from "next/link";
import type { Attendee } from "@/lib/airtable";

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function AttendeeList({ title, people, emptyText }: { title: string; people: Attendee[]; emptyText: string }) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body mb-3">
        {title} <span className="text-ink">({people.length})</span>
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-body">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {people.map((p, i) => {
            const chip = (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${p.isMe ? "border-brand bg-brand/10 text-ink" : "border-line bg-white text-ink"}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{initials(p.name)}</span>
                {p.name}{p.isMe ? " (you)" : ""}
              </span>
            );
            return (
              <li key={`${p.name}-${i}`}>
                {p.memberId ? <Link href={`/directory/${p.memberId}`} className="hover:opacity-80">{chip}</Link> : chip}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
