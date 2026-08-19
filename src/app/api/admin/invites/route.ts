import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stand-in for the create-invite Edge Function (supabase/functions/create-invite)
// until it's deployed — see the comment at the top of that file. Same
// logic: verify the caller is an admin, then insert with the service-role
// key so the invite exists regardless of what RLS would otherwise allow.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email || !["admin", "manager", "rep"].includes(role)) {
    return NextResponse.json({ error: "email and a valid role are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: invite, error } = await adminClient
    .from("invites")
    .insert({ email, role, invited_by: user.id })
    .select()
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? "Failed to create invite" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.json({ invite, link: `${siteUrl}/accept-invite?token=${invite.token}` });
}
