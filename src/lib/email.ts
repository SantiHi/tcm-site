import "server-only";
import { site } from "@/config/site";
import { formatEventRange, googleCalendarUrl } from "@/lib/dates";
import type { EventPublic } from "@/lib/airtable/events";

/**
 * Outbound email through Resend's REST API (no SDK needed).
 * Without RESEND_API_KEY the message is printed to the server log instead,
 * so the flow can be exercised locally.
 */

export type Mail = { to: string; subject: string; html: string; text: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(mail: Mail): Promise<{ sent: boolean; id?: string; reason?: string }> {
  if (!emailConfigured()) {
    console.log(`\n[email:dev] To: ${mail.to}\n[email:dev] Subject: ${mail.subject}\n${mail.text}\n`);
    return { sent: false, reason: "RESEND_API_KEY / EMAIL_FROM not set; printed to server log" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email] send failed:", res.status, detail);
    return { sent: false, reason: `Resend ${res.status}` };
  }
  const json = (await res.json()) as { id?: string };
  return { sent: true, id: json.id };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;color:#6b6b6b">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:22px;color:#111111;margin:0 0 16px">${esc(title)}</h1>
  ${bodyHtml}
  <p style="font-size:12px;color:#9a9a9a;margin-top:32px;border-top:1px solid #e2e5ea;padding-top:16px">${esc(site.name)} alumni portal · ${esc(site.disclaimer)}</p>
</div></body></html>`;
}

export function eventReminderMail(event: EventPublic, eventUrl: string, kind: "confirmation" | "reminder"): Omit<Mail, "to"> {
  const when = formatEventRange(event.start, event.end);
  const subject = kind === "confirmation" ? `Reminder set: ${event.title}` : `Tomorrow: ${event.title}`;
  const intro = kind === "confirmation" ? "You asked to be reminded about this event. We'll email you again the day before." : "This is your reminder for an event coming up.";
  const text = [intro, "", event.title, when, event.location ? `Where: ${event.location}` : "", event.description ? "" : "", event.description, "", `Details: ${eventUrl}`, event.link ? `Event link: ${event.link}` : ""]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const html = layout(
    subject,
    `<p>${esc(intro)}</p>
     <div style="background:#f7f8fa;border-radius:12px;padding:20px;margin:16px 0">
       <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111111">${esc(event.title)}</p>
       <p style="margin:0 0 4px">${esc(when)}</p>
       ${event.location ? `<p style="margin:0 0 4px">${esc(event.location)}</p>` : ""}
       ${event.description ? `<p style="margin:12px 0 0;white-space:pre-line">${esc(event.description)}</p>` : ""}
     </div>
     <p><a href="${esc(eventUrl)}" style="display:inline-block;background:#d97b2c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">View event</a></p>
     ${event.link ? `<p style="font-size:14px">Event link: <a href="${esc(event.link)}" style="color:#d97b2c">${esc(event.link)}</a></p>` : ""}`,
  );
  return { subject, html, text };
}

export function eventRsvpMail(event: EventPublic, eventUrl: string, status: "going" | "maybe"): Omit<Mail, "to"> {
  const when = formatEventRange(event.start, event.end);
  const subject = status === "going" ? `You're going: ${event.title}` : `Marked maybe: ${event.title}`;
  const intro = status === "going"
    ? "You're on the list. We'll email you a reminder the day before."
    : "You're marked as a maybe. You can change your RSVP any time from the event page.";
  const gcal = googleCalendarUrl(event);
  const text = [intro, "", event.title, when, event.location ? `Where: ${event.location}` : "", "", `Event page: ${eventUrl}`, `Add to Google Calendar: ${gcal}`, `Download .ics: ${eventUrl}/calendar.ics`].join("\n").replace(/\n{3,}/g, "\n\n");
  const html = layout(
    subject,
    `<p>${esc(intro)}</p>
     <div style="background:#f7f8fa;border-radius:12px;padding:20px;margin:16px 0">
       <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111111">${esc(event.title)}</p>
       <p style="margin:0 0 4px">${esc(when)}</p>
       ${event.location ? `<p style="margin:0">${esc(event.location)}</p>` : ""}
     </div>
     <p><a href="${esc(eventUrl)}" style="display:inline-block;background:#d97b2c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">View event</a></p>
     <p style="font-size:14px"><a href="${esc(gcal)}" style="color:#d97b2c">Add to Google Calendar</a> · <a href="${esc(eventUrl)}/calendar.ics" style="color:#d97b2c">Download .ics</a></p>`,
  );
  return { subject, html, text };
}

export function eventCancelledMail(event: EventPublic, eventUrl: string): Omit<Mail, "to"> {
  const when = formatEventRange(event.start, event.end);
  const subject = `Cancelled: ${event.title}`;
  const intro = `${event.postedBy || "The organizer"} has cancelled this event. Sorry for any inconvenience.`;
  const text = [intro, "", event.title, when, event.location ? `Where: ${event.location}` : "", "", `Event page: ${eventUrl}`].join("\n").replace(/\n{3,}/g, "\n\n");
  const html = layout(
    subject,
    `<p>${esc(intro)}</p>
     <div style="background:#f7f8fa;border-radius:12px;padding:20px;margin:16px 0">
       <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111111;text-decoration:line-through">${esc(event.title)}</p>
       <p style="margin:0 0 4px">${esc(when)}</p>
       ${event.location ? `<p style="margin:0">${esc(event.location)}</p>` : ""}
     </div>
     <p><a href="${esc(eventUrl)}" style="color:#d97b2c">View event page</a></p>`,
  );
  return { subject, html, text };
}
