import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { getEvent, getFeatures } from "@/lib/airtable";
import { formatEventRange, googleCalendarUrl } from "@/lib/dates";
import { ReminderButton } from "@/components/ReminderButton";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { CancelEventButton } from "@/components/CancelEventButton";
import { RsvpButtons } from "@/components/RsvpButtons";
import { AttendeeList } from "@/components/AttendeeList";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const { error } = await searchParams;
  const [event, features] = await Promise.all([getEvent(id, member.email), getFeatures()]);
  if (!event) notFound();

  const closed = event.cancelled || event.isPast;
  const notifyCount = event.goingCount + event.maybeCount;

  return (
    <div className="container-site py-12 sm:py-16">
      <Link href="/events" className="nav-link inline-flex items-center gap-2 mb-8">
        <span aria-hidden="true">&larr;</span> Events
      </Link>

      <div className="card max-w-2xl mx-auto overflow-hidden">
        {event.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Airtable attachment URLs expire; skip the optimizer
          <img src={event.image.full} alt="" className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 h-56 sm:h-72 w-[calc(100%+3rem)] sm:w-[calc(100%+4rem)] max-w-none object-cover" />
        )}
        {error === "delete" && <p role="alert" className="mb-6 rounded-[6px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">Deleting failed. Please try again.</p>}
        {error === "image" && <p role="alert" className="mb-6 rounded-[6px] bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">The event was saved, but the banner image couldn&apos;t be uploaded. Try a smaller JPEG or PNG.</p>}
        {error === "cancel" && <p role="alert" className="mb-6 rounded-[6px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">Updating the event failed. Please try again.</p>}
        {event.cancelled && (
          <p className="mb-6 rounded-[6px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <strong>This event has been cancelled.</strong> Everyone who RSVP&apos;d was notified by email.
          </p>
        )}
        {!event.cancelled && event.isPast && <p className="mb-4 inline-block rounded-full bg-card border border-line text-body text-xs font-semibold uppercase tracking-[0.12em] px-3 py-1">Past event</p>}

        <div className="flex flex-wrap items-center gap-2 mb-2">
          {event.type && <span className="rounded-full bg-white border border-line px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-body">{event.type}</span>}
          {!closed && event.isFull && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-nav font-semibold uppercase tracking-[0.08em] text-amber-800">Full</span>}
        </div>
        <h1 className={`text-3xl leading-tight ${event.cancelled ? "line-through text-body" : ""}`}>{event.title}</h1>
        <p className="text-ink mt-3 font-medium">{formatEventRange(event.start, event.end)}</p>
        {event.location && (
          <p className="text-body mt-1">
            {event.location}
            {!/^(zoom|online|virtual|teams|google meet|remote)/i.test(event.location) && (
              <>
                {" "}·{" "}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="link text-sm">Open in Maps</a>
              </>
            )}
          </p>
        )}
        <p className="text-xs text-body mt-3">Posted by {event.postedBy || "a member"}</p>

        {event.description && <p className="mt-6 whitespace-pre-line text-body leading-relaxed">{event.description}</p>}

        {event.link && (
          <p className="mt-6">
            <a href={event.link} target="_blank" rel="noopener noreferrer" className="btn-secondary">Event link</a>
          </p>
        )}

        {features.rsvp && (
          <div className="mt-8 border-t border-line pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-lg">Are you coming?</h2>
              <p className="text-sm text-body">
                <span className="text-ink font-medium">{event.goingCount} going</span>
                {event.maybeCount > 0 && <> · {event.maybeCount} maybe</>}
                {event.capacity !== null && <> · {event.spotsLeft} of {event.capacity} spot{event.capacity === 1 ? "" : "s"} left</>}
              </p>
            </div>
            {closed ? (
              <p className="text-sm text-body">{event.cancelled ? "RSVPs are closed because the event was cancelled." : "This event has already happened."}</p>
            ) : (
              <RsvpButtons eventId={event.id} myRsvp={event.myRsvp} isFull={event.isFull} disabled={false} />
            )}
            <div className="mt-6 grid grid-cols-1 gap-6">
              <AttendeeList title="Going" people={event.going} emptyText={closed ? "Nobody RSVP'd." : "No one yet. Be the first!"} />
              {event.maybe.length > 0 && <AttendeeList title="Maybe" people={event.maybe} emptyText="" />}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-line pt-8 flex flex-col gap-4">
          {!closed && event.myRsvp !== "going" && <ReminderButton eventId={event.id} initialOn={event.reminderSet} />}
          {!closed && event.myRsvp === "going" && <p className="text-sm text-body">Reminder on: we&apos;ll email you the day before.</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="link">Add to Google Calendar</a>
            <a href={`/events/${event.id}/calendar.ics`} className="link">Download .ics</a>
            <CopyLinkButton path={`/events/${event.id}`} />
          </div>
        </div>

        {event.isOwner && (
          <div className="mt-8 border-t border-line pt-6 flex flex-wrap items-center justify-between gap-4">
            <Link href={`/events/${event.id}/edit`} className="btn-secondary">Edit event</Link>
            <div className="flex items-center gap-5">
              <CancelEventButton eventId={event.id} cancelled={event.cancelled} notifyCount={notifyCount} />
              <DeleteEventButton eventId={event.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
