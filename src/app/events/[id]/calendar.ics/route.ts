import { getEvent } from "@/lib/airtable";
import { getSessionEmail } from "@/lib/auth/session";
import { icsForEvent } from "@/lib/dates";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await getSessionEmail();
  if (!email) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const event = await getEvent(id, email);
  if (!event) return new Response("Not found", { status: 404 });
  const body = icsForEvent(event, new URL(req.url).host);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics"`,
    },
  });
}
