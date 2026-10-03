import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { getFeatures } from "@/lib/airtable";
import { isDemoMode } from "@/lib/env";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const member = await requireMember();
  const features = await getFeatures();

  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">My Profile</h1>
        <p className="text-body">Keep your details current so fellow alumni can find you.</p>
      </div>
      <ProfileForm member={member} features={features} showAdminHints={isDemoMode()} />
    </div>
  );
}
