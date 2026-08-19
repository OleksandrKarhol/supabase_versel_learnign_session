"use client";

import { useState } from "react";

const ROLES = ["rep", "manager", "admin"];

type Invite = { id: string; email: string; role: string; status: string; token: string; expires_at: string; created_at: string };

export function InviteForm({ onCreated }: { onCreated: (invite: Invite) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("rep");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setLink(null);
    try {
      // Stand-in for supabase.functions.invoke("create-invite", ...) until
      // that Edge Function is deployed — see supabase/functions/create-invite.
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create invite");
      setLink(body.link);
      setEmail("");
      onCreated(body.invite);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)" }}
            placeholder="teammate@company.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded border bg-white px-3 py-1.5 text-sm uppercase"
            style={{ borderColor: "var(--border)" }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--green-mid)" }}
        >
          {submitting ? "Inviting…" : "Send invite"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--rust)" }}>
          {error}
        </p>
      )}
      {link && (
        <div className="mt-3 rounded border p-3" style={{ borderColor: "var(--border)", background: "#eef2ec" }}>
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--green-mid)" }}>
            Invite created — copy this link and share it manually (no email is sent):
          </p>
          <input
            readOnly
            value={link}
            onClick={(e) => e.currentTarget.select()}
            className="w-full rounded border bg-white px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      )}
    </form>
  );
}
