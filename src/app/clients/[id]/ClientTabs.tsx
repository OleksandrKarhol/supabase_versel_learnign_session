"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ClientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const isData = pathname?.endsWith("/data");

  const tabStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "var(--bg)", color: "var(--ink)" }
      : { color: "rgba(255,255,255,0.75)" };

  return (
    <nav className="mt-4 flex gap-1 text-sm">
      <Link href={`/clients/${id}`} className="rounded-t px-4 py-2 font-medium" style={tabStyle(!isData)}>
        Report
      </Link>
      <Link
        href={`/clients/${id}/data`}
        className="rounded-t px-4 py-2 font-medium"
        style={tabStyle(!!isData)}
      >
        Raw Data
      </Link>
    </nav>
  );
}
