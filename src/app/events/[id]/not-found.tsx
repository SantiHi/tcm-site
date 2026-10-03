import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="container-site py-24 text-center">
      <h1 className="text-3xl mb-3">Event not found</h1>
      <p className="text-body mb-8">This event doesn&apos;t exist or was removed.</p>
      <Link href="/events" className="btn-secondary">Back to events</Link>
    </div>
  );
}
