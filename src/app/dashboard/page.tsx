import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

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
        <SignOutButton />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
        <h2 className="mb-4 text-lg font-bold">Client Directory</h2>

        {error && (
          <p className="rounded border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--rust)" }}>
            Couldn&apos;t load clients — this usually means the database migration
            hasn&apos;t been run yet. See <code>supabase/migrations/0001_init.sql</code>.
            <br />
            <span className="opacity-70">({error.message})</span>
          </p>
        )}

        {!error && (
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
                </tr>
              </thead>
              <tbody>
                {clients?.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-t"
                    style={{
                      borderColor: "var(--border)",
                      background: i % 2 === 0 ? "var(--card-bg)" : "#faf8f2",
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>
                      {c.industry}
                    </td>
                    <td className="px-4 py-3">{c.plan}</td>
                    <td className="px-4 py-3">${Number(c.arr).toLocaleString()}</td>
                    <td className="px-4 py-3">{c.active_rooms}</td>
                    <td className="px-4 py-3">{c.total_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-xs" style={{ color: "var(--ink-soft)" }}>
          Phase 1: auth + roles + read-only client directory. Reporting, raw data, invites,
          cron jobs, and chat land in later phases.
        </p>
      </main>
    </div>
  );
}
