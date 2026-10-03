import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth/session";

/**
 * Place / address suggestions for the location fields.
 *  - With GOOGLE_MAPS_API_KEY: Google Places Autocomplete (New).
 *  - Without: Photon (photon.komoot.io), a free OpenStreetMap geocoder. Fine
 *    for a small member portal; switch to Google for heavier use.
 * Signed-in members only. Never returns anything member-specific.
 */
export type PlaceSuggestion = { label: string; secondary: string; value: string };

export async function GET(req: Request) {
  if (!(await getSessionEmail())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const mode = url.searchParams.get("mode") === "city" ? "city" : "address";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = process.env.GOOGLE_MAPS_API_KEY ? await google(q, mode) : await photon(q, mode);
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.warn("[places] lookup failed:", (err as Error).message);
    return NextResponse.json({ suggestions: [] });
  }
}

async function google(q: string, mode: "address" | "city"): Promise<PlaceSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY! },
    body: JSON.stringify({ input: q, ...(mode === "city" ? { includedPrimaryTypes: ["(cities)"] } : {}) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}`);
  const data = (await res.json()) as { suggestions?: { placePrediction?: { text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }[] };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.text?.text))
    .slice(0, 6)
    .map((p) => ({
      label: p.structuredFormat?.mainText?.text ?? p.text!.text!,
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
      value: p.text!.text!,
    }));
}

type PhotonProps = { name?: string; housenumber?: string; street?: string; city?: string; town?: string; village?: string; state?: string; country?: string; countrycode?: string; osm_value?: string };

async function photon(q: string, mode: "address" | "city"): Promise<PlaceSuggestion[]> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "6");
  u.searchParams.set("lang", "en");
  if (mode === "city") {
    u.searchParams.append("osm_tag", "place:city");
    u.searchParams.append("osm_tag", "place:town");
    u.searchParams.append("osm_tag", "place:village");
  }
  const res = await fetch(u, { headers: { "User-Agent": "tiger-capital-alumni-portal/1.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: { properties: PhotonProps }[] };
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const cityName = p.city ?? p.town ?? p.village;
    const country = p.countrycode === "US" ? "USA" : p.country;
    let label: string;
    let secondary: string;
    if (mode === "city") {
      label = p.name ?? cityName ?? "";
      secondary = [p.state, country].filter(Boolean).join(", ");
    } else {
      const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
      label = p.name ?? streetLine;
      secondary = [p.name && streetLine ? streetLine : null, cityName, p.state, country].filter(Boolean).join(", ");
    }
    if (!label) continue;
    const value = [label, secondary].filter(Boolean).join(", ");
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ label, secondary, value });
  }
  return out;
}
