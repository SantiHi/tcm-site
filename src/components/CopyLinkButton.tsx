"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="link text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
