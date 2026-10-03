import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { getFeatures, listEvents, type EventView } from "@/lib/airtable";
import { EventCard } from "@/components/EventCard";

export const metadata: Metadata = { title: "Home" };

function QuickLink({ href, title, text, cta }: { href: string; title: string; text: string; cta: string }) {
  return (
    <Link href={href} className="card flex flex-col justify-between gap-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <h2 className="text-lg">{title}</h2>
        <p className="text-sm text-body mt-1">{text}</p>
      </div>
      <span className="nav-link text-brand">{cta} &rarr;</span>
    </Link>
  );
}

export default async function HomePage() {
  const member = await requireMember();
  const features = await getFeatures();
  let upcoming: EventView[] = [];
  if (features.events) {
    try {
      upcoming = (await listEvents(member.email)).filter((e) => !e.isPast && !e.cancelled).slice(0, 3);
    } catch (err) {
      console.warn("[home] events unavailable:", (err as Error).message);
    }
  }
  const firstName = member.name.split(/\s+/)[0] || "there";
  const nudges = [
    features.location && !member.location && "add your location",
    features.linkedinUrl && !member.linkedinUrl && "add your LinkedIn",
    !member.firm && "add your firm",
  ].filter(Boolean) as string[];

  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">Welcome back, {firstName}</h1>
        <p className="text-body">The Tiger Capital Management alumni network, in one place.</p>
      </div>

      {nudges.length > 0 && (
        <p className="mb-8 rounded-[6px] bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 text-center">
          Help classmates find you: <Link href="/profile" className="link font-medium">{nudges.join(", ")}</Link>.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        <QuickLink href="/directory" title="Alumni Directory" text="Find classmates by name, class year, firm, or location." cta="Browse" />
        <QuickLink href="/events" title="Events" text="See what's coming up, RSVP, and post your own." cta="See events" />
        <QuickLink href="/profile" title="My Profile" text="Keep your firm, location, and LinkedIn current." cta="Edit profile" />
      </div>

      {features.events && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.12em] font-nav font-semibold text-body">Upcoming events</h2>
            <Link href="/events" className="link text-sm">All events</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-ink font-medium mb-2">Nothing on the calendar yet.</p>
              <p className="text-body text-sm">Be the first to <Link href="/events/new" className="link">post an event</Link>.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
