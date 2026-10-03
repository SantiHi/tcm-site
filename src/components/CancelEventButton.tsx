"use client";

import { cancelEventAction } from "@/app/actions/events";

export function CancelEventButton({ eventId, cancelled, notifyCount }: { eventId: string; cancelled: boolean; notifyCount: number }) {
  return (
    <form
      action={cancelEventAction}
      onSubmit={(e) => {
        const msg = cancelled
          ? "Reinstate this event?"
          : `Cancel this event?${notifyCount ? ` ${notifyCount} member${notifyCount === 1 ? "" : "s"} who responded will be emailed.` : ""}`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="cancelled" value={cancelled ? "0" : "1"} />
      <button type="submit" className="text-sm text-ink hover:underline underline-offset-2">
        {cancelled ? "Reinstate event" : "Cancel event"}
      </button>
    </form>
  );
}
