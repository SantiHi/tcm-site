"use server";

import { revalidatePath } from "next/cache";
import { getFeatures, updateMemberByEmail, type ProfilePatch } from "@/lib/airtable";
import { getSessionEmail } from "@/lib/auth/session";

export type ProfileState = { ok: boolean; message: string } | null;

const LINKEDIN_RE = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/.+/i;

function normalizeLinkedIn(raw: string): string | null | "invalid" {
  const v = raw.trim();
  if (!v) return null;
  if (!LINKEDIN_RE.test(v)) return "invalid";
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    u.protocol = "https:";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "invalid";
  }
}

/**
 * Update the logged-in member's own record. The record is located by the
 * session email on the server; nothing identifying the record comes from
 * the form.
 */
export async function updateMyProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, message: "Your session has expired. Please log in again." };

  const features = await getFeatures();
  const patch: ProfilePatch = {};

  const firm = String(formData.get("firm") ?? "").trim();
  if (firm.length > 120) return { ok: false, message: "Firm name is too long (120 characters max)." };
  patch.firm = firm;

  if (features.location) {
    const location = String(formData.get("location") ?? "").trim();
    if (location.length > 120) return { ok: false, message: "Location is too long (120 characters max)." };
    patch.location = location;
  }

  if (features.linkedinUrl) {
    const li = normalizeLinkedIn(String(formData.get("linkedinUrl") ?? ""));
    if (li === "invalid") return { ok: false, message: "LinkedIn URL must be a linkedin.com link." };
    patch.linkedinUrl = li;
  }

  if (features.showInDirectory) {
    patch.showInDirectory = formData.get("showInDirectory") === "on";
  }

  try {
    await updateMemberByEmail(email, patch);
  } catch (err) {
    console.error("[profile] update failed:", err);
    return { ok: false, message: "Saving failed. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true, message: "Profile saved." };
}
