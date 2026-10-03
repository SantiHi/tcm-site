import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { getEvent, getFeatures } from "@/lib/airtable";
import { updateEventAction } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const [event, features] = await Promise.all([getEvent(id, member.email), getFeatures()]);
  if (!event) notFound();
  if (!event.isOwner) redirect(`/events/${id}`);

  const action = updateEventAction.bind(null, id);
  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">Edit Event</h1>
        <p className="text-body">Only you can edit or delete events you posted.</p>
      </div>
      <EventForm action={action} event={event} features={features} submitLabel="Save Changes" cancelHref={`/events/${id}`} />
    </div>
  );
}
