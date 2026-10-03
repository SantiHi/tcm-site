import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { getFeatures } from "@/lib/airtable";
import { createEventAction } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";

export const metadata: Metadata = { title: "Post an event" };

export default async function NewEventPage() {
  await requireMember();
  const features = await getFeatures();
  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">Post an Event</h1>
        <p className="text-body">Every alumni member will see it on the Events page.</p>
      </div>
      <EventForm action={createEventAction} features={features} submitLabel="Post Event" cancelHref="/events" />
    </div>
  );
}
