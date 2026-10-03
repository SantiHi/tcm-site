import "server-only";
import { eventTypes } from "@/config/site";
import { airtableFetch, config, listAll, normalizeEmail, RECORD_ID_RE, str, tablePath, type AirtableRecord } from "@/lib/airtable/client";
import { getMemberLookup, type MemberLookup } from "@/lib/airtable/members";
import { getSchema, type EventColumns } from "@/lib/airtable/schema";

/**
 * Events table access.
 *
 * Private columns ("Posted By Email", "Reminder Emails", "Going", "Maybe")
 * hold emails and are used only on the server. What leaves this module is
 * the public event plus the viewer's own relationship to it and attendee
 * display names (never their emails).
 */

export type EventPublic = {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string | null;
  location: string;
  description: string;
  link: string | null;
  postedBy: string;
  cancelled: boolean;
  type: string | null;
  capacity: number | null;
  /** Banner image URLs (Airtable attachment URLs expire after a few hours; pages are rendered on demand). */
  image: { card: string; full: string; width: number | null; height: number | null } | null;
};

export type Attendee = { name: string; memberId: string | null; isMe: boolean };
export type RsvpStatus = "going" | "maybe" | "none";

export type EventView = EventPublic & {
  isOwner: boolean;
  reminderSet: boolean;
  myRsvp: Exclude<RsvpStatus, "none"> | null;
  going: Attendee[];
  maybe: Attendee[];
  goingCount: number;
  maybeCount: number;
  spotsLeft: number | null;
  isFull: boolean;
  isPast: boolean;
};

export type EventInput = {
  title: string;
  start: string; // ISO
  end: string | null;
  location: string;
  description: string;
  link: string | null;
  type: string | null;
  capacity: number | null;
};

export class EventFullError extends Error {}

async function eventsSchema() {
  const s = await getSchema();
  if (!s.events || s.events.missing.length) throw new Error("Events table is not set up. Run `npm run airtable:setup`.");
  return s.events;
}

function emailList(r: AirtableRecord, col: string | null): string[] {
  if (!col) return [];
  return str(r.fields[col]).split(/\r?\n/).map(normalizeEmail).filter(Boolean);
}

function toAttendees(emails: string[], lookup: MemberLookup, viewer: string): Attendee[] {
  return emails
    .map((email) => {
      const m = lookup.get(email);
      return { name: m?.name || "Alumni member", memberId: m?.visible ? m.id : null, isMe: email === viewer };
    })
    .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name));
}

function toView(r: AirtableRecord, c: EventColumns, viewerEmail: string, lookup: MemberLookup): EventView {
  const viewer = normalizeEmail(viewerEmail);
  const owner = normalizeEmail(r.fields[c.postedByEmail]);
  const link = str(r.fields[c.link]);
  const going = emailList(r, c.going);
  const maybe = emailList(r, c.maybe);
  const capRaw = c.capacity ? Number(r.fields[c.capacity]) : NaN;
  const capacity = Number.isFinite(capRaw) && capRaw > 0 ? Math.floor(capRaw) : null;
  const start = str(r.fields[c.start]);
  const end = str(r.fields[c.end]) || null;
  const endMs = new Date(end ?? start).getTime();
  return {
    id: r.id,
    title: str(r.fields[c.title]),
    start,
    end,
    location: str(r.fields[c.location]),
    description: str(r.fields[c.description]),
    link: link || null,
    postedBy: str(r.fields[c.postedBy]),
    cancelled: Boolean(r.fields[c.cancelled]),
    type: c.type ? str(r.fields[c.type]) || null : null,
    capacity,
    image: toImage(r, c),
    isOwner: owner !== "" && owner === viewer,
    reminderSet: emailList(r, c.reminderEmails).includes(viewer),
    myRsvp: going.includes(viewer) ? "going" : maybe.includes(viewer) ? "maybe" : null,
    going: toAttendees(going, lookup, viewer),
    maybe: toAttendees(maybe, lookup, viewer),
    goingCount: going.length,
    maybeCount: maybe.length,
    spotsLeft: capacity === null ? null : Math.max(0, capacity - going.length),
    isFull: capacity !== null && going.length >= capacity,
    isPast: !Number.isNaN(endMs) && endMs < Date.now() - 60 * 60 * 1000,
  };
}

type Attachment = { url: string; width?: number; height?: number; type?: string; thumbnails?: { large?: { url: string }; full?: { url: string } } };

function toImage(r: AirtableRecord, c: EventColumns): EventPublic["image"] {
  if (!c.image) return null;
  const list = r.fields[c.image];
  if (!Array.isArray(list) || !list.length) return null;
  const a = list[0] as Attachment;
  if (!a?.url) return null;
  return { card: a.thumbnails?.large?.url ?? a.url, full: a.thumbnails?.full?.url ?? a.url, width: a.width ?? null, height: a.height ?? null };
}

function allFields(c: EventColumns) {
  return Object.values(c).filter((v): v is string => Boolean(v));
}

export async function listEvents(viewerEmail: string): Promise<EventView[]> {
  const { table, columns: c } = await eventsSchema();
  const [records, lookup] = await Promise.all([
    listAll(table, { "fields[]": allFields(c), pageSize: "100", "sort[0][field]": c.start, "sort[0][direction]": "asc" }),
    getMemberLookup(),
  ]);
  return records.filter((r) => str(r.fields[c.title]) && str(r.fields[c.start])).map((r) => toView(r, c, viewerEmail, lookup));
}

async function getRecord(id: string): Promise<{ record: AirtableRecord; table: string; columns: EventColumns } | null> {
  if (!RECORD_ID_RE.test(id)) return null;
  const { table, columns } = await eventsSchema();
  try {
    const record = await airtableFetch<AirtableRecord>(`${tablePath(table)}/${id}`);
    return { record, table, columns };
  } catch {
    return null;
  }
}

export async function getEvent(id: string, viewerEmail: string): Promise<EventView | null> {
  const hit = await getRecord(id);
  if (!hit) return null;
  return toView(hit.record, hit.columns, viewerEmail, await getMemberLookup());
}

function inputToFields(input: EventInput, c: EventColumns): Record<string, unknown> {
  const f: Record<string, unknown> = {
    [c.title]: input.title,
    [c.start]: input.start,
    [c.end]: input.end ?? null,
    [c.location]: input.location,
    [c.description]: input.description,
    [c.link]: input.link ?? null,
  };
  if (c.type) f[c.type] = input.type && (eventTypes as readonly string[]).includes(input.type) ? input.type : null;
  if (c.capacity) f[c.capacity] = input.capacity ?? null;
  return f;
}

async function assertOwner(record: AirtableRecord, c: EventColumns, email: string, verb: string) {
  if (normalizeEmail(record.fields[c.postedByEmail]) !== normalizeEmail(email)) throw new Error(`You can only ${verb} events you posted.`);
}

async function patch(table: string, id: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
  return airtableFetch<AirtableRecord>(`${tablePath(table)}/${id}`, { method: "PATCH", body: JSON.stringify({ fields, typecast: false }) });
}

/** Create an event on behalf of the verified member. */
export async function createEvent(ownerEmail: string, ownerName: string, input: EventInput): Promise<EventView> {
  const { table, columns: c } = await eventsSchema();
  const record = await airtableFetch<AirtableRecord>(tablePath(table), {
    method: "POST",
    body: JSON.stringify({ fields: { ...inputToFields(input, c), [c.postedBy]: ownerName, [c.postedByEmail]: normalizeEmail(ownerEmail) }, typecast: false }),
  });
  return toView(record, c, ownerEmail, await getMemberLookup());
}

/** Update an event. Throws unless `ownerEmail` posted it. */
export async function updateEvent(ownerEmail: string, id: string, input: EventInput): Promise<EventView> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  await assertOwner(hit.record, hit.columns, ownerEmail, "edit");
  const updated = await patch(hit.table, id, inputToFields(input, hit.columns));
  return toView(updated, hit.columns, ownerEmail, await getMemberLookup());
}

/** Delete an event. Throws unless `ownerEmail` posted it. */
export async function deleteEvent(ownerEmail: string, id: string): Promise<void> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  await assertOwner(hit.record, hit.columns, ownerEmail, "delete");
  await airtableFetch<unknown>(`${tablePath(hit.table)}/${id}`, { method: "DELETE" });
}

/**
 * Cancel or reinstate an event. Returns the emails of everyone who should be
 * told (going, maybe, reminder subscribers). Caller sends the email.
 */
export async function setCancelled(ownerEmail: string, id: string, cancelled: boolean): Promise<{ event: EventView; recipients: string[] }> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  const { record, table, columns: c } = hit;
  await assertOwner(record, c, ownerEmail, "cancel");
  const updated = await patch(table, id, { [c.cancelled]: cancelled });
  const recipients = [...new Set([...emailList(record, c.going), ...emailList(record, c.maybe), ...emailList(record, c.reminderEmails)])].filter((e) => e !== normalizeEmail(ownerEmail));
  return { event: toView(updated, c, ownerEmail, await getMemberLookup()), recipients };
}

/** Add or remove the viewer's email from the event's reminder list. */
export async function setReminder(viewerEmail: string, id: string, on: boolean): Promise<EventView> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  const { record, table, columns: c } = hit;
  const me = normalizeEmail(viewerEmail);
  const current = emailList(record, c.reminderEmails);
  const next = on ? [...new Set([...current, me])] : current.filter((e) => e !== me);
  const updated = await patch(table, id, { [c.reminderEmails]: next.join("\n") });
  return toView(updated, c, viewerEmail, await getMemberLookup());
}

/**
 * Set the viewer's RSVP. "going" also subscribes them to the reminder.
 * Throws EventFullError when capacity is reached.
 */
export async function setRsvp(viewerEmail: string, id: string, status: RsvpStatus): Promise<EventView> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  const { record, table, columns: c } = hit;
  if (!c.going || !c.maybe) throw new Error("RSVPs are not set up. Run `npm run airtable:setup`.");
  const me = normalizeEmail(viewerEmail);
  const going = emailList(record, c.going).filter((e) => e !== me);
  const maybe = emailList(record, c.maybe).filter((e) => e !== me);
  const capRaw = c.capacity ? Number(record.fields[c.capacity]) : NaN;
  const capacity = Number.isFinite(capRaw) && capRaw > 0 ? Math.floor(capRaw) : null;

  if (status === "going") {
    if (capacity !== null && going.length >= capacity) throw new EventFullError("This event is full.");
    going.push(me);
  } else if (status === "maybe") {
    maybe.push(me);
  }
  const fields: Record<string, unknown> = { [c.going]: going.join("\n"), [c.maybe]: maybe.join("\n") };
  if (status === "going") {
    const reminders = emailList(record, c.reminderEmails);
    if (!reminders.includes(me)) fields[c.reminderEmails] = [...reminders, me].join("\n");
  }
  const updated = await patch(table, id, fields);
  return toView(updated, c, viewerEmail, await getMemberLookup());
}

/** For the reminder job only: events starting within the window that still need reminders. */
export async function listEventsDueForReminder(windowHours: number): Promise<{ event: EventPublic; recipients: string[] }[]> {
  const { table, columns: c } = await eventsSchema();
  const records = await listAll(table, { "fields[]": allFields(c), pageSize: "100" });
  const lookup = await getMemberLookup();
  const now = Date.now();
  const until = now + windowHours * 60 * 60 * 1000;
  const out: { event: EventPublic; recipients: string[] }[] = [];
  for (const r of records) {
    if (r.fields[c.reminderSent] || r.fields[c.cancelled]) continue;
    const start = new Date(str(r.fields[c.start])).getTime();
    if (Number.isNaN(start) || start < now || start > until) continue;
    const recipients = [...new Set([...emailList(r, c.reminderEmails), ...emailList(r, c.going)])];
    if (!recipients.length) continue;
    const v = toView(r, c, "", lookup);
    out.push({
      event: { id: v.id, title: v.title, start: v.start, end: v.end, location: v.location, description: v.description, link: v.link, postedBy: v.postedBy, cancelled: v.cancelled, type: v.type, capacity: v.capacity, image: v.image },
      recipients,
    });
  }
  return out;
}

export async function markReminderSent(id: string): Promise<void> {
  const { table, columns: c } = await eventsSchema();
  await patch(table, id, { [c.reminderSent]: true });
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Replace the event's banner image. Throws unless `ownerEmail` posted it.
 * Uses Airtable's upload endpoint (content.airtable.com), which accepts
 * base64 content up to 5 MB.
 */
export async function uploadEventImage(ownerEmail: string, id: string, file: { contentType: string; filename: string; base64: string }): Promise<void> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  const { record, table, columns: c } = hit;
  if (!c.image) throw new Error("Event images are not set up. Run `npm run airtable:setup`.");
  await assertOwner(record, c, ownerEmail, "edit");
  await patch(table, id, { [c.image]: [] }); // one banner at a time
  const { token, baseId } = config();
  const res = await fetch(`https://content.airtable.com/v0/${baseId}/${id}/${encodeURIComponent(c.image)}/uploadAttachment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.contentType, filename: file.filename, file: file.base64 }),
  });
  if (!res.ok) throw new Error(`Airtable attachment upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** Remove the event's banner image. Throws unless `ownerEmail` posted it. */
export async function removeEventImage(ownerEmail: string, id: string): Promise<void> {
  const hit = await getRecord(id);
  if (!hit) throw new Error("Event not found.");
  const { record, table, columns: c } = hit;
  if (!c.image) return;
  await assertOwner(record, c, ownerEmail, "edit");
  await patch(table, id, { [c.image]: [] });
}
