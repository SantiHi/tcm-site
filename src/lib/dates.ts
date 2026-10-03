/**
 * Date helpers shared by server and client. All event times are shown in
 * the club's time zone (see `timeZone` in src/config/site.ts) so server and
 * client render identically.
 */
import { timeZone } from "@/config/site";

function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

/** "2026-10-05T18:00" typed in the club time zone -> ISO string in UTC. */
export function localInputToIso(local: string, tz: string = timeZone): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - tzOffsetMs(new Date(guess), tz);
  utc = guess - tzOffsetMs(new Date(utc), tz); // second pass handles DST edges
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string -> value for <input type="datetime-local"> in the club time zone. */
export function isoToLocalInput(iso: string | null | undefined, tz: string = timeZone): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function formatEventDate(iso: string, tz: string = timeZone): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function formatEventTime(iso: string, tz: string = timeZone): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
}

export function formatEventRange(start: string, end: string | null, tz: string = timeZone): string {
  const date = formatEventDate(start, tz);
  const t1 = formatEventTime(start, tz);
  if (!end) return `${date} · ${t1}`;
  const sameDay = formatEventDate(end, tz) === date;
  return sameDay ? `${date} · ${t1} – ${formatEventTime(end, tz)}` : `${date} ${t1} – ${formatEventDate(end, tz)} ${formatEventTime(end, tz)}`;
}

/** Short pieces for the calendar-style date block on event cards. */
export function dateParts(iso: string, tz: string = timeZone): { month: string; day: string; weekday: string } {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", weekday: "short" }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { month: p.month ?? "", day: p.day ?? "", weekday: p.weekday ?? "" };
}

/** "October 2026" for grouping lists. */
export function monthLabel(iso: string, tz: string = timeZone): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", year: "numeric" }).format(d);
}

function icsStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(e: { title: string; start: string; end: string | null; location: string; description: string; link: string | null }): string {
  const end = e.end ?? new Date(new Date(e.start).getTime() + 60 * 60 * 1000).toISOString();
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", e.title);
  u.searchParams.set("dates", `${icsStamp(e.start)}/${icsStamp(end)}`);
  if (e.location) u.searchParams.set("location", e.location);
  const details = [e.description, e.link].filter(Boolean).join("\n\n");
  if (details) u.searchParams.set("details", details);
  return u.toString();
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function icsForEvent(e: { id: string; title: string; start: string; end: string | null; location: string; description: string; link: string | null }, host: string): string {
  const end = e.end ?? new Date(new Date(e.start).getTime() + 60 * 60 * 1000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiger Capital Management//Alumni Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@${host}`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    e.location ? `LOCATION:${icsEscape(e.location)}` : "",
    e.description || e.link ? `DESCRIPTION:${icsEscape([e.description, e.link].filter(Boolean).join("\n\n"))}` : "",
    e.link ? `URL:${e.link}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}
