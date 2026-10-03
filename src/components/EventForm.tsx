"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EventFormState } from "@/app/actions/events";
import { eventTypes } from "@/config/site";
import type { EventView, Features } from "@/lib/airtable";
import { isoToLocalInput } from "@/lib/dates";
import { PlaceInput } from "@/components/PlaceInput";

type Props = {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  event?: EventView;
  features: Pick<Features, "eventTypes" | "capacity" | "eventImages">;
  submitLabel: string;
  cancelHref: string;
};

export function EventForm({ action, event, features, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(action, null);
  const [imageError, setImageError] = useState<string | null>(null);

  return (
    <form action={formAction} className="card max-w-xl mx-auto">
      {state && (
        <p role="alert" className="mb-6 rounded-[6px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5">
        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" className="input" required maxLength={120} defaultValue={event?.title ?? ""} placeholder="Alumni happy hour in NYC" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="start" className="label">Starts</label>
            <input id="start" name="start" type="datetime-local" className="input" required defaultValue={isoToLocalInput(event?.start)} />
          </div>
          <div>
            <label htmlFor="end" className="label">Ends <span className="text-body font-normal">(optional)</span></label>
            <input id="end" name="end" type="datetime-local" className="input" defaultValue={isoToLocalInput(event?.end)} />
          </div>
        </div>
        <p className="text-xs text-body -mt-2">Times are in US Eastern.</p>
        {(features.eventTypes || features.capacity) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.eventTypes && (
              <div>
                <label htmlFor="type" className="label">Type</label>
                <select id="type" name="type" className="input" defaultValue={event?.type ?? ""}>
                  <option value="">Choose a type</option>
                  {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {features.capacity && (
              <div>
                <label htmlFor="capacity" className="label">Capacity <span className="text-body font-normal">(optional)</span></label>
                <input id="capacity" name="capacity" type="number" min={1} step={1} className="input" defaultValue={event?.capacity ?? ""} placeholder="Max number going" />
              </div>
            )}
          </div>
        )}
        <div>
          <label htmlFor="location" className="label">Location</label>
          <PlaceInput id="location" name="location" maxLength={200} defaultValue={event?.location ?? ""} placeholder="Start typing a venue or address, or “Zoom”" />
          <p className="text-xs text-body mt-1.5">Suggestions appear as you type. You can also type anything.</p>
        </div>
        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" className="input h-36 py-3 resize-y" maxLength={4000} defaultValue={event?.description ?? ""} placeholder="What's happening, who should come, anything to bring." />
        </div>
        {features.eventImages && (
          <div>
            <label htmlFor="image" className="label">Banner image <span className="text-body font-normal">(optional)</span></label>
            {event?.image && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- Airtable attachment URLs expire; skip the optimizer */}
                <img src={event.image.card} alt="" className="h-28 w-full rounded-[6px] object-cover" />
                <label className="mt-2 flex items-center gap-2 text-sm text-body">
                  <input type="checkbox" name="removeImage" className="h-4 w-4 accent-brand" /> Remove current image
                </label>
              </div>
            )}
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return setImageError(null);
                if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setImageError("Please choose a JPEG, PNG, or WebP image."); e.target.value = ""; return; }
                if (f.size > 4 * 1024 * 1024) { setImageError(`That image is ${(f.size / 1024 / 1024).toFixed(1)} MB. Please use one that is 4 MB or smaller.`); e.target.value = ""; return; }
                setImageError(null);
              }}
              className="block w-full text-sm text-body file:mr-4 file:rounded-full file:border-2 file:border-ink file:bg-white file:px-4 file:py-2 file:font-nav file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-ink hover:file:bg-ink hover:file:text-white" />
            {imageError ? <p role="alert" className="text-xs text-red-700 mt-1.5">{imageError}</p> : <p className="text-xs text-body mt-1.5">JPEG, PNG or WebP, up to 4 MB. Wide images (about 16:9) look best.</p>}
          </div>
        )}
        <div>
          <label htmlFor="link" className="label">Link <span className="text-body font-normal">(optional)</span></label>
          <input id="link" name="link" type="text" inputMode="url" className="input" defaultValue={event?.link ?? ""} placeholder="RSVP form, Zoom link, or event page" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" className="btn-primary w-full sm:flex-1" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </button>
          <Link href={cancelHref} className="btn-secondary w-full sm:w-auto">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
