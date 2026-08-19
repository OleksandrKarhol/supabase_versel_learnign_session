"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ROLES = ["admin", "manager", "rep"];

export function RoleSelect({ profileId, initialRole, disabled }: { profileId: string; initialRole: string; disabled?: boolean }) {
  const [role, setRole] = useState(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // RLS-enforced: profiles_update_admin_all requires is_admin() on the
    // caller's own session — no service-role key involved here.
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    setRole(newRole);
    setSaving(false);
  }

  return (
    <div>
      <select
        value={role}
        onChange={handleChange}
        disabled={disabled || saving}
        className="rounded border bg-white px-2 py-1 text-xs uppercase disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--rust)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
