import { NextResponse } from "next/server";
import { listEventsDueForReminder, markReminderSent } from "@/lib/airtable";
import { eventReminderMail, sendEmail } from "@/lib/email";

/**
 * Daily reminder job. Vercel Cron calls this (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. Sends one email per subscribed
 * member for events starting within the next 36 hours, then marks the event.
 *
 * Manual run: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const due = await listEventsDueForReminder(36);
  const summary: { event: string; recipients: number; sent: number }[] = [];

  for (const { event, recipients } of due) {
    const mail = eventReminderMail(event, `${origin}/events/${event.id}`, "reminder");
    let sent = 0;
    for (const to of recipients) {
      const r = await sendEmail({ to, ...mail });
      if (r.sent) sent++;
    }
    await markReminderSent(event.id);
    summary.push({ event: event.title, recipients: recipients.length, sent });
  }
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), events: summary });
}
