import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-site py-24 text-center">
      <h1 className="text-3xl mb-3">Page not found</h1>
      <p className="text-body mb-8">That page doesn&apos;t exist.</p>
      <Link href="/directory" className="btn-secondary">Go to directory</Link>
    </div>
  );
}
