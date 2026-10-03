"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eventTypes } from "@/config/site";
import { createEvent, deleteEvent, EventFullError, getEvent, IMAGE_MAX_BYTES, IMAGE_TYPES, removeEventImage, setCancelled, setReminder, setRsvp, updateEvent, uploadEventImage, type EventInput, type RsvpStatus } from "@/lib/airtable";
import { requireMember } from "@/lib/auth/session";
import { localInputToIso } from "@/lib/dates";
import { emailConfigured, eventCancelledMail, eventReminderMail, eventRsvpMail, sendEmail } from "@/lib/email";

export type EventFormState = { ok: false; message: string } | null;
export type ReminderState = { ok: boolean; message: string; reminderSet: boolean } | null;
export type RsvpState = { ok: boolean; message: string; myRsvp: "going" | "maybe" | null } | null;

function parseEventForm(formData: FormData): { input?: EventInput; error?: string } {
  const title = String(formData.get("title") ?? "").trim();
  const startLocal = String(formData.get("start") ?? "").trim();
  const endLocal = String(formData.get("end") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linkRaw = String(formData.get("link") ?? "").trim();

  if (!title) return { error: "Please give the event a title." };
  if (title.length > 120) return { error: "Title is too long (120 characters max)." };
  const start = localInputToIso(startLocal);
  if (!start) return { error: "Please choose a valid start date and time." };
  let end: string | null = null;
  if (endLocal) {
    end = localInputToIso(endLocal);
    if (!end) return { error: "The end time isn't valid." };
    if (new Date(end) <= new Date(start)) return { error: "The end time must be after the start time." };
  }
  if (location.length > 200) return { error: "Location is too long (200 characters max)." };
  if (description.length > 4000) return { error: "Description is too long (4000 characters max)." };
  let link: string | null = null;
  if (linkRaw) {
    const withScheme = /^https?:\/\//i.test(linkRaw) ? linkRaw : `https://${linkRaw}`;
    try {
      const u = new URL(withScheme);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      link = u.toString();
    } catch {
      return { error: "The event link must be a valid web address." };
    }
  }
  const typeRaw = String(formData.get("type") ?? "").trim();
  const type = typeRaw && (eventTypes as readonly string[]).includes(typeRaw) ? typeRaw : null;
  const capRaw = String(formData.get("capacity") ?? "").trim();
  let capacity: number | null = null;
  if (capRaw) {
    const n = Number(capRaw);
    if (!Number.isInteger(n) || n < 1 || n > 10000) return { error: "Capacity must be a whole number of at least 1." };
    capacity = n;
  }
  return { input: { title, start, end, location, description, link, type, capacity } };
}

type ImagePart = { file?: { contentType: string; filename: string; base64: string }; remove?: boolean; error?: string };

async function parseImage(formData: FormData): Promise<ImagePart> {
  const remove = formData.get("removeImage") === "on";
  const f = formData.get("image");
  if (!(f instanceof File) || f.size === 0) return { remove };
  if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return { error: "The image must be a JPEG, PNG, or WebP file." };
  if (f.size > IMAGE_MAX_BYTES) return { error: "The image must be 4 MB or smaller." };
  const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
  const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
  const safeName = (f.name || "banner").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80) || `banner.${ext}`;
  return { file: { contentType: f.type, filename: safeName, base64 }, remove: false };
}

export async function createEventAction(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const member = await requireMember();
  const { input, error } = parseEventForm(formData);
  if (error || !input) return { ok: false, message: error ?? "Invalid form." };
  const image = await parseImage(formData);
  if (image.error) return { ok: false, message: image.error };
  let id: string;
  try {
    const created = await createEvent(member.email, member.name, input);
    id = created.id;
  } catch (err) {
    console.error("[events] create failed:", err);
    return { ok: false, message: "Posting failed. Please try again." };
  }
  let imageError = false;
  if (image.file) {
    try {
      await uploadEventImage(member.email, id, image.file);
    } catch (err) {
      console.error("[events] image upload failed:", err);
      imageError = true;
    }
  }
  revalidatePath("/events");
  redirect(`/events/${id}${imageError ? "?error=image" : ""}`);
}

export async function updateEventAction(id: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const member = await requireMember();
  const { input, error } = parseEventForm(formData);
  if (error || !input) return { ok: false, message: error ?? "Invalid form." };
  const image = await parseImage(formData);
  if (image.error) return { ok: false, message: image.error };
  try {
    await updateEvent(member.email, id, input); // ownership verified server-side
  } catch (err) {
    console.error("[events] update failed:", err);
    return { ok: false, message: err instanceof Error && /only edit/.test(err.message) ? err.message : "Saving failed. Please try again." };
  }
  let imageError = false;
  try {
    if (image.file) await uploadEventImage(member.email, id, image.file);
    else if (image.remove) await removeEventImage(member.email, id);
  } catch (err) {
    console.error("[events] image update failed:", err);
    imageError = true;
  }
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}${imageError ? "?error=image" : ""}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = String(formData.get("id") ?? "");
  try {
    await deleteEvent(member.email, id); // ownership verified server-side
  } catch (err) {
    console.error("[events] delete failed:", err);
    redirect(`/events/${id}?error=delete`);
  }
  revalidatePath("/events");
  redirect("/events");
}

async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function toggleReminderAction(_prev: ReminderState, formData: FormData): Promise<ReminderState> {
  const member = await requireMember();
  const id = String(formData.get("id") ?? "");
  const on = formData.get("on") === "1";
  try {
    const event = await setReminder(member.email, id, on);
    revalidatePath(`/events/${id}`);
    if (!on) return { ok: true, message: "Reminder removed.", reminderSet: false };

    const mail = eventReminderMail(event, `${await appOrigin()}/events/${event.id}`, "confirmation");
    const result = await sendEmail({ to: member.email, ...mail });
    const message = result.sent
      ? `Reminder set. We emailed ${member.email} and will remind you the day before.`
      : emailConfigured()
        ? "Reminder set, but the confirmation email couldn't be sent."
        : "Reminder set. (Email sending isn't configured yet, so the message was printed to the server log.)";
    return { ok: true, message, reminderSet: true };
  } catch (err) {
    console.error("[events] reminder failed:", err);
    const current = await getEvent(id, member.email).catch(() => null);
    return { ok: false, message: "Couldn't update your reminder. Please try again.", reminderSet: current?.reminderSet ?? false };
  }
}

export async function rsvpAction(_prev: RsvpState, formData: FormData): Promise<RsvpState> {
  const member = await requireMember();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const status: RsvpStatus = raw === "going" || raw === "maybe" ? raw : "none";
  try {
    const event = await setRsvp(member.email, id, status);
    revalidatePath(`/events/${id}`);
    revalidatePath("/events");
    if (status === "none") return { ok: true, message: "RSVP removed.", myRsvp: null };
    const mail = eventRsvpMail(event, `${await appOrigin()}/events/${event.id}`, status);
    const result = await sendEmail({ to: member.email, ...mail });
    const base = status === "going" ? "You're going." : "Marked as maybe.";
    const tail = result.sent
      ? ` We emailed ${member.email} with calendar links.`
      : emailConfigured() ? " (Confirmation email couldn't be sent.)" : " (Email isn't configured yet; the confirmation was printed to the server log.)";
    return { ok: true, message: base + (status === "going" ? " You'll get a reminder the day before." : "") + tail, myRsvp: status };
  } catch (err) {
    const current = await getEvent(id, member.email).catch(() => null);
    if (err instanceof EventFullError) return { ok: false, message: "This event is full. You can still mark yourself as a maybe.", myRsvp: current?.myRsvp ?? null };
    console.error("[events] rsvp failed:", err);
    return { ok: false, message: "Couldn't save your RSVP. Please try again.", myRsvp: current?.myRsvp ?? null };
  }
}

export async function cancelEventAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = String(formData.get("id") ?? "");
  const cancelled = formData.get("cancelled") === "1";
  try {
    const { event, recipients } = await setCancelled(member.email, id, cancelled); // ownership verified server-side
    if (cancelled && recipients.length) {
      const mail = eventCancelledMail(event, `${await appOrigin()}/events/${event.id}`);
      for (const to of recipients) await sendEmail({ to, ...mail });
    }
  } catch (err) {
    console.error("[events] cancel failed:", err);
    redirect(`/events/${id}?error=cancel`);
  }
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}
