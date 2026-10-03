"use client";

import { useActionState } from "react";
import { updateMyProfile, type ProfileState } from "@/app/actions/profile";
import type { Features, MemberSelf } from "@/lib/airtable";
import { PlaceInput } from "@/components/PlaceInput";

export function ProfileForm({ member, features, showAdminHints }: { member: MemberSelf; features: Features; showAdminHints: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateMyProfile, null);
  const missing = [!features.linkedinUrl && "LinkedIn URL", !features.showInDirectory && "Show in directory", !features.location && "Location"].filter(Boolean) as string[];

  return (
    <form action={action} className="card max-w-xl mx-auto">
      {state && (
        <p role="status" className={`mb-6 rounded-[6px] border px-4 py-3 text-sm ${state.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" className="input" value={member.name} disabled readOnly />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" className="input" value={member.email} disabled readOnly />
          </div>
          <div>
            <label htmlFor="classYear" className="label">Class Year</label>
            <input id="classYear" className="input" value={member.classYear} disabled readOnly />
          </div>
        </div>
        <p className="text-xs text-body -mt-2">Name, email and class year are managed by TCM. Contact us to change them.</p>

        <div>
          <label htmlFor="firm" className="label">Firm</label>
          <input id="firm" name="firm" className="input" defaultValue={member.firm} maxLength={120} placeholder="Where do you work?" />
        </div>

        {features.location && (
          <div>
            <label htmlFor="location" className="label">Location</label>
            <PlaceInput id="location" name="location" mode="city" defaultValue={member.location ?? ""} maxLength={120} placeholder="City, e.g. New York" />
          </div>
        )}

        {features.linkedinUrl && (
          <div>
            <label htmlFor="linkedinUrl" className="label">LinkedIn URL</label>
            <input id="linkedinUrl" name="linkedinUrl" type="text" inputMode="url" autoComplete="url" className="input" defaultValue={member.linkedinUrl ?? ""} placeholder="https://www.linkedin.com/in/your-name" />
          </div>
        )}

        {features.showInDirectory && (
          <label className="flex items-start gap-3 rounded-[6px] bg-white border border-line px-4 py-4 cursor-pointer">
            <input type="checkbox" name="showInDirectory" defaultChecked={member.showInDirectory ?? false} className="mt-1 h-4 w-4 accent-brand" />
            <span>
              <span className="block font-medium text-ink">Show me in the directory</span>
              <span className="block text-sm text-body">When off, other alumni can&apos;t see your profile.</span>
            </span>
          </label>
        )}

        {showAdminHints && missing.length > 0 && (
          <p className="text-xs text-body rounded-[6px] bg-amber-50 border border-amber-200 px-4 py-3">
            Admin note (demo mode only): add the column{missing.length > 1 ? "s" : ""} {missing.map((m) => `"${m}"`).join(" and ")} to the Members table in Airtable and the matching field{missing.length > 1 ? "s" : ""} will appear here automatically.
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
