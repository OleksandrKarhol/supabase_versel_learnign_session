import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoleSelect } from "./RoleSelect";
import { InvitesSection } from "./InvitesSection";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (myProfile?.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, status, token, expires_at, created_at")
    .order("created_at", { ascending: false });

  // Server-only: emails live on auth.users, not exposed via PostgREST, so
  // this is the one place the service-role admin client is used for a
  // plain read rather than a privileged write.
  const adminClient = createAdminClient();
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  const emailById = new Map(usersList?.users.map((u) => [u.id, u.email]) ?? []);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="px-8 py-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--header-bg), var(--header-bg-2))" }}
      >
        <Link href="/dashboard" className="text-xs opacity-70 hover:opacity-100">
          ← Client Directory
        </Link>
        <h1 className="mt-1 text-xl font-bold">Users &amp; Invites</h1>
        <p className="text-xs opacity-80">Admin only — enforced by RLS, not just this page.</p>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-8 py-8">
        <h2 className="mb-4 text-lg font-bold">Team Members</h2>
        <div className="mb-8 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: "var(--tan)" }}>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p, i) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "#faf8f2" : "white" }}>
                  <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{emailById.get(p.id) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RoleSelect profileId={p.id} initialRole={p.role} disabled={p.id === user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-4 text-lg font-bold">Invites</h2>
        <InvitesSection initialInvites={invites ?? []} siteUrl={siteUrl} />
      </main>
    </div>
  );
}
