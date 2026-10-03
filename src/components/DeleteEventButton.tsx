"use client";

import { deleteEventAction } from "@/app/actions/events";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={deleteEventAction}
      onSubmit={(e) => {
        if (!confirm("Delete this event? This can't be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={eventId} />
      <button type="submit" className="text-sm text-red-700 hover:underline underline-offset-2">Delete event</button>
    </form>
  );
}
