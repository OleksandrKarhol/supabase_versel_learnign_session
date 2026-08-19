"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const QUOTA = 10;

export function TrackToggle({
  clientId,
  quarter,
  userId,
  initialTracked,
  initialRemaining,
}: {
  clientId: string;
  quarter: string;
  userId: string;
  initialTracked: boolean;
  initialRemaining: number;
}) {
  const [tracked, setTracked] = useState(initialTracked);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atQuota = !tracked && remaining <= 0;

  async function toggle() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (tracked) {
      const { error } = await supabase
        .from("tracked_clients")
        .delete()
        .eq("rep_id", userId)
        .eq("client_id", clientId)
        .eq("quarter", quarter);
      if (error) setError(error.message);
      else {
        setTracked(false);
        setRemaining((r) => r + 1);
      }
    } else {
      const { error } = await supabase.from("tracked_clients").insert({ rep_id: userId, client_id: clientId, quarter });
      if (error) setError(error.message);
      else {
        setTracked(true);
        setRemaining((r) => r - 1);
      }
    }
    setBusy(false);
  }

  return (
    <div className="text-right">
      <button
        onClick={toggle}
        disabled={busy || atQuota}
        className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        style={
          tracked
            ? { background: "rgba(244,241,230,0.2)", color: "#f4f1e6", border: "1px solid rgba(244,241,230,0.5)" }
            : { background: "white", color: "var(--green-mid)" }
        }
        title={atQuota ? "Quota reached for this quarter" : undefined}
      >
        {tracked ? "Tracked ✓ (untrack)" : atQuota ? "Quota reached" : "Track this client"}
      </button>
      <div className="mt-1 text-[10px] opacity-70">
        {remaining}/{QUOTA} slots left this quarter ({quarter})
      </div>
      {error && (
        <div className="mt-1 text-[10px]" style={{ color: "#f6cdbf" }}>
          {error}
        </div>
      )}
    </div>
  );
}
