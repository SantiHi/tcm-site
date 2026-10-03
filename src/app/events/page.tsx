import type { Metadata } from "next";
import Link from "next/link";
import { eventTypes } from "@/config/site";
import { requireMember } from "@/lib/auth/session";
import { getFeatures, listEvents, type EventView } from "@/lib/airtable";
import { monthLabel } from "@/lib/dates";
import { EventCard } from "@/components/EventCard";

export const metadata: Metadata = { title: "Events" };

type Tab = "upcoming" | "mine" | "past";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ show?: string; type?: string }> }) {
  const member = await requireMember();
  const features = await getFeatures();
  const { show, type } = await searchParams;

  if (!features.events) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="text-4xl mb-3">Events</h1>
        <p className="text-body">Events aren&apos;t set up yet. Run <code className="text-ink">npm run airtable:setup</code> to create the Events table.</p>
      </div>
    );
  }

  const all = await listEvents(member.email);
  const tab: Tab = show === "past" ? "past" : show === "mine" ? "mine" : "upcoming";
  const typeFilter = type && (eventTypes as readonly string[]).includes(type) ? type : "";

  const upcoming = all.filter((e) => !e.isPast);
  const past = [...all.filter((e) => e.isPast)].reverse();
  const mine = all.filter((e) => e.isOwner || e.myRsvp !== null);
  const source = tab === "past" ? past : tab === "mine" ? mine : upcoming;
  const list = typeFilter ? source.filter((e) => e.type === typeFilter) : source;

  const href = (t: Tab, ty = typeFilter) => {
    const p = new URLSearchParams();
    if (t !== "upcoming") p.set("show", t);
    if (ty) p.set("type", ty);
    const q = p.toString();
    return q ? `/events?${q}` : "/events";
  };

  // Group by month for upcoming, keep flat otherwise
  const groups: { label: string; items: EventView[] }[] = [];
  for (const e of list) {
    const label = tab === "past" ? monthLabel(e.start) : tab === "mine" ? (e.isPast ? "Past" : monthLabel(e.start)) : monthLabel(e.start);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }
  const typesInUse = [...new Set(all.map((e) => e.type).filter(Boolean))] as string[];

  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">Events</h1>
        <p className="text-body">Meetups, panels, and reunions posted by fellow alumni. RSVP to see who else is coming.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <nav className="flex gap-6" aria-label="Event lists">
          <Link href={href("upcoming")} className={`nav-link ${tab === "upcoming" ? "text-brand" : ""}`}>Upcoming ({upcoming.length})</Link>
          <Link href={href("mine")} className={`nav-link ${tab === "mine" ? "text-brand" : ""}`}>Mine ({mine.length})</Link>
          <Link href={href("past")} className={`nav-link ${tab === "past" ? "text-brand" : ""}`}>Past ({past.length})</Link>
        </nav>
        <Link href="/events/new" className="btn-primary w-full sm:w-auto">Post an event</Link>
      </div>

      {features.eventTypes && typesInUse.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href={href(tab, "")} className={`rounded-full border px-3 py-1 text-xs font-nav font-semibold uppercase tracking-[0.08em] ${!typeFilter ? "border-ink bg-ink text-white" : "border-line text-body hover:border-ink"}`}>All types</Link>
          {typesInUse.map((t) => (
            <Link key={t} href={href(tab, t)} className={`rounded-full border px-3 py-1 text-xs font-nav font-semibold uppercase tracking-[0.08em] ${typeFilter === t ? "border-ink bg-ink text-white" : "border-line text-body hover:border-ink"}`}>{t}</Link>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-ink font-medium mb-2">
            {tab === "past" ? "No past events yet." : tab === "mine" ? "Nothing here yet." : "Nothing on the calendar yet."}
          </p>
          <p className="text-body text-sm">
            {tab === "mine" ? <>Events you post or RSVP to will show up here. <Link href="/events" className="link">Browse upcoming events</Link>.</> : <>Be the first to <Link href="/events/new" className="link">post an event</Link>.</>}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body mb-4">{g.label}</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {g.items.map((e) => <EventCard key={e.id} event={e} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
