# Client Pulse

A per-account intelligence reporting platform for Sales & Customer Success at a
virtual data room (VDR) provider — built as a hands-on vehicle for learning
Supabase + Vercel.

See [client-pulse-app-plan.md](client-pulse-app-plan.md) for the full feature
plan and how each piece maps to a Supabase/Vercel primitive, and
[client-pulse-brainstorm.md](client-pulse-brainstorm.md) for the original
product framing. [learning-session-plan.md](learning-session-plan.md) and
the accompanying slide deck cover the "why this stack" session this project
grew out of.

## Status

**Phase 1** (current): auth, roles (`admin`/`manager`/`rep`), and a read-only
client directory, with access enforced via Postgres RLS rather than app-layer
checks. See [client-pulse-app-plan.md](client-pulse-app-plan.md) for the
remaining phases (reporting tab, raw data views, invites, mock cron jobs,
simulated chat).

## Local development

```bash
npm install
npm run dev
```

Copy [.env.example](.env.example) to `.env.local` and fill in your Supabase
project's URL, anon key, and service role key first — see
[SETUP.md](SETUP.md) for where to find them.

Database schema lives in [supabase/migrations](supabase/migrations) — run
against your Supabase project via the SQL Editor or your migration pipeline
of choice.

## Stack

- [Next.js](https://nextjs.org) (App Router) on [Vercel](https://vercel.com)
- [Supabase](https://supabase.com) — Postgres, Auth, RLS, Storage, cron
- Deployed via the Vercel ↔ Supabase integration
