"use client";

import { useState } from "react";
import { InviteForm } from "./InviteForm";
import { CopyLinkButton } from "./CopyLinkButton";

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
};

function statusPill(status: string) {
  const styles: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#eef2ec", color: "var(--green-mid)" },
    accepted: { bg: "#e7e1d2", color: "var(--ink-soft)" },
    expired: { bg: "#f6e6e0", color: "var(--rust)" },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function InvitesSection({ initialInvites, siteUrl }: { initialInvites: Invite[]; siteUrl: string }) {
  const [invites, setInvites] = useState(initialInvites);

  return (
    <div>
      <InviteForm onCreated={(invite) => setInvites((prev) => [invite, ...prev])} />

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: "var(--tan)" }}>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Expires</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv, i) => (
              <tr key={inv.id} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "#faf8f2" : "white" }}>
                <td className="px-3 py-2">{inv.email}</td>
                <td className="px-3 py-2 uppercase" style={{ color: "var(--ink-soft)" }}>{inv.role}</td>
                <td className="px-3 py-2">{statusPill(inv.status)}</td>
                <td className="px-3 py-2">{new Date(inv.expires_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {inv.status === "pending" && <CopyLinkButton link={`${siteUrl}/accept-invite?token=${inv.token}`} />}
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                  No invites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
