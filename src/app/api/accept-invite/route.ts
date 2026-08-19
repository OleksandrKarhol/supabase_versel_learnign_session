import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "token and an 8+ character password are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: invite, error: inviteError } = await adminClient
    .from("invites")
    .select("id, email, role, status, expires_at")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `Invite already ${invite.status}` }, { status: 400 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { invited_role: invite.role, full_name: invite.email.split("@")[0] },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create account" }, { status: 500 });
  }

  await adminClient
    .from("invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Sign the new user in on this response so they land on /dashboard already authenticated.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInError) {
    return NextResponse.json({ ok: true, redirectTo: "/login" });
  }

  return NextResponse.json({ ok: true });
}
