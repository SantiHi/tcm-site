"use client";

import { useActionState } from "react";
import { toggleReminderAction, type ReminderState } from "@/app/actions/events";

export function ReminderButton({ eventId, initialOn }: { eventId: string; initialOn: boolean }) {
  const [state, action, pending] = useActionState<ReminderState, FormData>(toggleReminderAction, null);
  const on = state ? state.reminderSet : initialOn;

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="id" value={eventId} />
        <input type="hidden" name="on" value={on ? "0" : "1"} />
        <button type="submit" className={on ? "btn-secondary w-full sm:w-auto" : "btn-primary w-full sm:w-auto"} disabled={pending}>
          {pending ? "Saving…" : on ? "Reminder on · turn off" : "Remind me by email"}
        </button>
      </form>
      {state && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>
      )}
    </div>
  );
}
