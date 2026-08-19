import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteForm } from "./AcceptInviteForm";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm rounded-lg border bg-white p-8" style={{ borderColor: "var(--border)" }}>
        <h1 className="mb-1 text-xl font-bold">Client Pulse</h1>
        {children}
      </div>
    </div>
  );
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Shell>
        <p className="mt-4 text-sm" style={{ color: "var(--rust)" }}>
          Missing invite token.
        </p>
      </Shell>
    );
  }

  // Server-only service-role lookup — invites has no public SELECT policy,
  // so this is the only way to validate a token before the invitee has an
  // account of their own.
  const adminClient = createAdminClient();
  const { data: invite } = await adminClient
    .from("invites")
    .select("email, role, status, expires_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <Shell>
        <p className="mt-4 text-sm" style={{ color: "var(--rust)" }}>
          This invite link isn&apos;t valid.
        </p>
      </Shell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <Shell>
        <p className="mt-4 text-sm" style={{ color: "var(--rust)" }}>
          This invite has already been {invite.status}.
        </p>
      </Shell>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <p className="mt-4 text-sm" style={{ color: "var(--rust)" }}>
          This invite expired on {new Date(invite.expires_at).toLocaleDateString()}.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-soft)" }}>
        You&apos;ve been invited as <strong>{invite.email}</strong> with the{" "}
        <strong className="uppercase">{invite.role}</strong> role. Set a password to finish creating your account.
      </p>
      <AcceptInviteForm token={token} />
    </Shell>
  );
}
