"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-site py-24 text-center">
      <h1 className="text-3xl mb-3">Something went wrong</h1>
      <p className="text-body mb-8">We couldn&apos;t load this page. Please try again in a moment.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" className="btn-secondary" onClick={reset}>Try again</button>
        <Link href="/directory" className="btn-secondary">Go to directory</Link>
      </div>
      {error.digest && <p className="mt-8 text-xs text-body">Reference: {error.digest}</p>}
    </div>
  );
}
