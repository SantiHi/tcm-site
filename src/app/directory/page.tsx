import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { listDirectory } from "@/lib/airtable";
import { DirectoryClient } from "@/components/DirectoryClient";

export const metadata: Metadata = { title: "Directory" };

export default async function DirectoryPage() {
  await requireMember();
  const members = await listDirectory(); // public fields only

  return (
    <div className="container-site py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3">Alumni Directory</h1>
        <p className="text-body">Find fellow Tiger Capital alumni by name, class year, or firm.</p>
      </div>
      <DirectoryClient members={members} />
    </div>
  );
}
