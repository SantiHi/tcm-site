import Link from "next/link";
import type { EventView } from "@/lib/airtable";
import { dateParts, formatEventTime } from "@/lib/dates";

export function EventCard({ event }: { event: EventView }) {
  const d = dateParts(event.start);
  return (
    <li>
      <Link href={`/events/${event.id}`} className="card flex flex-col gap-5 h-full transition hover:-translate-y-0.5 hover:shadow-md overflow-hidden">
        {event.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Airtable attachment URLs expire; skip the optimizer
          <img src={event.image.card} alt="" className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 h-40 w-[calc(100%+3rem)] sm:w-[calc(100%+4rem)] max-w-none object-cover" />
        )}
        <div className="flex gap-5">
        <div className="shrink-0 w-16 rounded-[8px] bg-white border border-line text-center py-2">
          <div className="font-nav text-[11px] uppercase tracking-[0.12em] text-brand font-semibold">{d.month}</div>
          <div className="font-heading text-2xl font-bold text-ink leading-none mt-1">{d.day}</div>
          <div className="text-[11px] text-body mt-1">{d.weekday}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {event.type && <span className="rounded-full bg-white border border-line px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-body">{event.type}</span>}
            {event.cancelled && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-red-700">Cancelled</span>}
            {!event.cancelled && event.isFull && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-amber-800">Full</span>}
            {event.myRsvp === "going" && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-green-700">You&apos;re going</span>}
            {event.myRsvp === "maybe" && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-brand">Maybe</span>}
            {event.isOwner && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-white">Yours</span>}
          </div>
          <h2 className={`text-lg leading-snug ${event.cancelled ? "line-through text-body" : ""}`}>{event.title}</h2>
          <p className="text-sm text-body mt-1">{formatEventTime(event.start)}{event.location ? ` · ${event.location}` : ""}</p>
          {event.description && <p className="text-sm text-body mt-2 line-clamp-2">{event.description}</p>}
          <p className="text-xs text-body mt-3 flex flex-wrap gap-x-3">
            <span>Posted by {event.postedBy || "a member"}</span>
            <span className="text-ink">{event.goingCount} going{event.maybeCount ? ` · ${event.maybeCount} maybe` : ""}{event.spotsLeft !== null && !event.cancelled ? ` · ${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left` : ""}</span>
          </p>
        </div>
        </div>
      </Link>
    </li>
  );
}
