"use client";

import { useState } from "react";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded border px-2 py-1 text-xs font-semibold"
      style={{ borderColor: "var(--border)", color: "var(--green-mid)" }}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
