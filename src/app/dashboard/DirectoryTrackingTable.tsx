"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  plan: string | null;
  arr: number;
  active_rooms: number;
  total_users: number;
};

const QUOTA = 10;

export function DirectoryTrackingTable({
  clients,
  trackedClientIds,
  quarter,
  userId,
}: {
  clients: ClientRow[];
  trackedClientIds: string[];
  quarter: string;
  userId: string;
}) {
  const [tracked, setTracked] = useState(new Set(trackedClientIds));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = QUOTA - tracked.size;

  async function toggle(clientId: string) {
    setBusyId(clientId);
    setError(null);
    const supabase = createClient();
    const isTracked = tracked.has(clientId);

    if (isTracked) {
      const { error } = await supabase
        .from("tracked_clients")
        .delete()
        .eq("rep_id", userId)
        .eq("client_id", clientId)
        .eq("quarter", quarter);
      if (error) {
        setError(error.message);
      } else {
        setTracked((prev) => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
      }
    } else {
      const { error } = await supabase.from("tracked_clients").insert({ rep_id: userId, client_id: clientId, quarter });
      if (error) {
        setError(error.message);
      } else {
        setTracked((prev) => new Set(prev).add(clientId));
      }
    }
    setBusyId(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Client Directory</h2>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: remaining <= 0 ? "#f6e6e0" : "#eef2ec", color: remaining <= 0 ? "var(--rust)" : "var(--green-mid)" }}
        >
          Tracking {tracked.size}/{QUOTA} this quarter ({quarter})
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded border p-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--rust)" }}>
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: "var(--tan)", color: "var(--ink)" }}>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Industry</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">ARR</th>
              <th className="px-4 py-3 font-semibold">Active Rooms</th>
              <th className="px-4 py-3 font-semibold">Users</th>
              <th className="px-4 py-3 font-semibold"></th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => {
              const isTracked = tracked.has(c.id);
              const atQuota = !isTracked && remaining <= 0;
              return (
                <tr
                  key={c.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--card-bg)" : "#faf8f2" }}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{c.industry}</td>
                  <td className="px-4 py-3">{c.plan}</td>
                  <td className="px-4 py-3">${Number(c.arr).toLocaleString()}</td>
                  <td className="px-4 py-3">{c.active_rooms}</td>
                  <td className="px-4 py-3">{c.total_users}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/clients/${c.id}`} className="mr-3 font-semibold underline" style={{ color: "var(--green-mid)" }}>
                      Report
                    </Link>
                    <Link href={`/clients/${c.id}/data`} className="font-semibold underline" style={{ color: "var(--green-mid)" }}>
                      Raw Data
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(c.id)}
                      disabled={busyId === c.id || atQuota}
                      className="rounded px-3 py-1 text-xs font-semibold disabled:opacity-50"
                      style={
                        isTracked
                          ? { background: "#eef2ec", color: "var(--green-mid)" }
                          : { border: "1px solid var(--border)", color: "var(--ink-soft)" }
                      }
                      title={atQuota ? "Quota reached for this quarter" : undefined}
                    >
                      {isTracked ? "Tracked ✓" : atQuota ? "Quota reached" : "Track"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
