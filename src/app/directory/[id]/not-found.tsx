import Link from "next/link";

export default function MemberNotFound() {
  return (
    <div className="container-site py-24 text-center">
      <h1 className="text-3xl mb-3">Member not found</h1>
      <p className="text-body mb-8">This profile doesn&apos;t exist or isn&apos;t listed in the directory.</p>
      <Link href="/directory" className="btn-secondary">Back to directory</Link>
    </div>
  );
}
