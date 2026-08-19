import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentQuarter } from "@/lib/quarter";
import { SignOutButton } from "./sign-out-button";
import { DirectoryTrackingTable } from "./DirectoryTrackingTable";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, industry, plan, arr, active_rooms, total_users")
    .order("arr", { ascending: false });

  const quarter = currentQuarter();
  const { data: tracked } = await supabase
    .from("tracked_clients")
    .select("client_id")
    .eq("rep_id", user!.id)
    .eq("quarter", quarter);

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-center justify-between px-8 py-5 text-white"
        style={{
          background: "linear-gradient(135deg, var(--header-bg), var(--header-bg-2))",
        }}
      >
        <div>
          <h1 className="text-xl font-bold">Client Pulse</h1>
          <p className="text-xs opacity-80">
            Signed in as {profile?.full_name || user?.email} ·{" "}
            <span className="uppercase tracking-wide">{profile?.role ?? "rep"}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === "admin" && (
            <Link href="/admin/users" className="text-xs font-semibold underline opacity-90 hover:opacity-100">
              Users &amp; Invites
            </Link>
          )}
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
        {error && (
          <p className="rounded border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--rust)" }}>
            Couldn&apos;t load clients — this usually means the database migration
            hasn&apos;t been run yet. See <code>supabase/migrations/0001_init.sql</code>.
            <br />
            <span className="opacity-70">({error.message})</span>
          </p>
        )}

        {!error && (
          <DirectoryTrackingTable
            clients={clients ?? []}
            trackedClientIds={(tracked ?? []).map((t) => t.client_id)}
            quarter={quarter}
            userId={user!.id}
          />
        )}

        <p className="mt-6 text-xs" style={{ color: "var(--ink-soft)" }}>
          Phase 3: access management is live — track up to 10 clients per quarter, and admins
          can manage roles and invites under <strong>Users &amp; Invites</strong>. Mock cron
          jobs and chat land in later phases.
        </p>
      </main>
    </div>
  );
}
