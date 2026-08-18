# Setup: accounts & keys

Before I can start scaffolding Client Pulse, a few things need to exist that only you can create (account signup, org/billing decisions). This is the full list — should take about 10 minutes.

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in / create an account (GitHub login is the fastest path).
2. Create a new project — pick any name (e.g. `client-pulse`), a database password (save it somewhere — you won't need it day-to-day since we'll use the API keys below, but it's needed for direct DB access later), and a region close to you.
3. Wait ~2 minutes for provisioning.
4. In the project, go to **Project Settings → API**. You'll need three values from this page:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "reveal") → `SUPABASE_SERVICE_ROLE_KEY`

   The `anon` key is safe to expose in the browser (that's what RLS is for). The `service_role` key bypasses RLS entirely — it's only ever used server-side, never in frontend code.

5. Copy [.env.example](.env.example) to `.env.local` in the project and fill in those three values.

That's it for Supabase for now — I'll handle creating tables, RLS policies, Storage buckets, and cron jobs via migrations once we start building.

## 2. Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in / create an account (GitHub login again is easiest, and lets Vercel auto-deploy on push once we have a repo).
2. Nothing to configure yet — we'll run `vercel link` (or connect the GitHub repo) once the Next.js app exists locally. I'll walk you through that step when we get there.
3. When we do link the project, the same three env vars from `.env.local` will need to be added in **Vercel → Project → Settings → Environment Variables**, scoped to Production/Preview/Development. I'll flag exactly when to do this.

## 3. What you do NOT need to set up

Per the locked-in plan decisions:
- No email provider (invites are mocked — a link shown in the UI, not a real sent email)
- No LLM/AI API key (chat is simulated over mock data, not a real model call)
- No GitHub walkthrough needed (per your earlier note) — but a GitHub account is the easiest way to sign into both Supabase and Vercel, so use it if you have one

## Once you've done steps 1–2

Let me know and send over the three Supabase values (or just confirm `.env.local` is filled in — I don't need to see the actual secrets in chat, just confirmation they're in place). Then I'll scaffold Phase 1: Next.js app, Supabase client wiring, the `profiles`/`clients` tables with RLS, and a basic login-gated page.
