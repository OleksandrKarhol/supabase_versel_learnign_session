// Supabase Edge Function: create-invite
//
// Verifies the caller is an admin, then inserts an invites row using the
// service-role key (bypassing RLS's admin-only insert policy at the API
// layer too, as a second check) and returns the invite + a shareable link.
//
// NOT YET DEPLOYED — this project's migrations ship via the GitHub
// integration, which doesn't deploy Edge Functions. Until this is deployed
// (`supabase functions deploy create-invite`, or pasted into
// Dashboard -> Edge Functions -> New Function), the identical logic runs
// as a Next.js Route Handler at /api/admin/invites so the invite flow
// still works end-to-end today. Once deployed, swap the fetch call in
// src/app/admin/users/InviteForm.tsx to `supabase.functions.invoke`.
//
// deno-lint-ignore-file
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  // Client scoped to the caller's own JWT, purely to check who they are.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });
  }

  const { data: isAdmin } = await callerClient.rpc("is_admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email || !["admin", "manager", "rep"].includes(role)) {
    return new Response(JSON.stringify({ error: "email and a valid role are required" }), { status: 400 });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: invite, error } = await adminClient
    .from("invites")
    .insert({ email, role, invited_by: user.id })
    .select()
    .single();

  if (error || !invite) {
    return new Response(JSON.stringify({ error: error?.message ?? "Failed to create invite" }), { status: 500 });
  }

  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
  return new Response(
    JSON.stringify({ invite, link: `${siteUrl}/accept-invite?token=${invite.token}` }),
    { headers: { "Content-Type": "application/json" } }
  );
});
