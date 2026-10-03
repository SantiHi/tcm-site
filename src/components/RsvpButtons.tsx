"use client";

import { useActionState } from "react";
import { rsvpAction, type RsvpState } from "@/app/actions/events";

type Props = { eventId: string; myRsvp: "going" | "maybe" | null; isFull: boolean; disabled: boolean };
type Status = "going" | "maybe" | "none";

function RsvpForm({ eventId, status, label, primary, disabled, pressed, action }: {
  eventId: string; status: Status; label: string; primary?: boolean; disabled: boolean; pressed: boolean;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={disabled} className={primary ? "btn-primary w-full sm:w-auto" : "btn-secondary w-full sm:w-auto"} aria-pressed={pressed}>
        {label}
      </button>
    </form>
  );
}

export function RsvpButtons({ eventId, myRsvp, isFull, disabled }: Props) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(rsvpAction, null);
  const current = state ? state.myRsvp : myRsvp;
  const goingBlocked = isFull && current !== "going";
  const off = pending || disabled;
  const common = { eventId, action, pressed: false };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3">
        {current === "going" ? (
          <>
            <span className="btn-primary w-full sm:w-auto cursor-default">You&apos;re going ✓</span>
            <RsvpForm {...common} status="maybe" label="Change to maybe" disabled={off} />
            <RsvpForm {...common} status="none" label="Can't go" disabled={off} />
          </>
        ) : current === "maybe" ? (
          <>
            <RsvpForm {...common} status="going" label={goingBlocked ? "Full" : "I'm going"} primary disabled={off || goingBlocked} />
            <span className="btn-secondary w-full sm:w-auto cursor-default bg-ink text-white">Maybe ✓</span>
            <RsvpForm {...common} status="none" label="Can't go" disabled={off} />
          </>
        ) : (
          <>
            <RsvpForm {...common} status="going" label={goingBlocked ? "Full" : "I'm going"} primary disabled={off || goingBlocked} />
            <RsvpForm {...common} status="maybe" label="Maybe" disabled={off} />
          </>
        )}
      </div>
      {state && <p role="status" className={`mt-3 text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
    </div>
  );
}
