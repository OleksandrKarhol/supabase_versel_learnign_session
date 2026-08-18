# Client Pulse: Per-Account Intelligence Reports

*Brainstorm / spec draft — VDR (virtual data room) provider, Data/AI team*

## 1. Background

We currently produce **Product Pulse**: an aggregated monthly HTML report for product managers, built by AI over that month's client calls and support tickets. It surfaces feature requests, UI preferences, pain points, and competitor mentions — but it's generalized across *all* clients and *all* calls for the month. Useful for product-level trend spotting, too coarse to act on for a single account.

## 2. The gap

Nothing today gives Sales and Customer Success a **per-client, actionable view** of their most important accounts. A CS manager can't currently answer, in one place: *"Is my biggest client healthy right now, and if not, why?"*

## 3. Proposal: Client Pulse

A scheduled, per-client report available to Sales and CS for a defined set of priority accounts (not necessarily "key accounts" as a formal label — just accounts a rep chooses to track closely).

**Access model:** each rep can request up to **N clients per quarter** (e.g. 10) to track. Reports are generated on a cadence (monthly or quarterly, configurable) for each tracked client.

### 3.1 Report contents

**Client profile (factual/static-ish)**
- Client name, industry, tenure (time as customer)
- Current plan/tier
- Total VDRs (rooms): total ever, currently active
- Total users
- Total data volume across rooms
- Revenue generated (trailing 12 months, or since plan start)

**Voice-of-customer (AI-derived from calls & tickets)**
- Support ticket summary: volume this period vs. last period, themes, recurring issues
- CS call analysis: topics discussed, pain points raised, features requested
- Sales call analysis (from the original sales cycle): competitors mentioned, objections raised
- NPS / CSAT trend, with delta vs. prior period

**Expansion signal**
- Use-case mix: transactional (M&A, fundraising — time-boxed, room closes after deal) vs. durable (internal document repository, compliance archive — long-lived, recurring revenue)
- Expansion status: already expanded into a durable use case? (true/false)
- Expansion likelihood: a score/estimate with a stated basis — a blend of deterministic signals (industry benchmark, account size, tenure, # of past deals, explicit interest mentioned in calls) and an AI-derived read of call transcripts for expansion-relevant language. Show the *reasons*, not just a number — this is what makes it actionable rather than a black box.

**The "so what"**
- The report's job is to produce a sentence like: *"CSAT dropped 12% this quarter, correlated with a 3x increase in tickets about [feature] breaking — recommend flagging to product."* This synthesis line(s) is the actual deliverable; the metrics above are its evidence.

### 3.2 Example user story

A CS manager opens their quarterly report for a previously-top account and sees: fewer active rooms than last quarter, a support ticket spike, and a CSAT dip. The report's synthesis points to a recurring bug complaint as the likely driver. Action: loop in the PM for that feature area — informed by evidence, not a hunch.

## 4. Why this is a good vehicle for the Supabase + Vercel learning session

It naturally exercises:
- **Relational modeling** — clients, reports, calls, tickets, users/reps, request quotas
- **Auth + RLS** — a rep should only see reports for clients they requested/own; role distinction between CS/Sales rep and admin
- **Scheduled jobs** — monthly/quarterly report generation (`pg_cron` or Vercel Cron)
- **AI integration** — LLM calls over transcripts/tickets to extract themes, sentiment, expansion signal
- **Storage** — generated HTML (and optionally PDF) reports persisted per client per period
- **A real frontend** — a small dashboard: request a client to track, view report history, view latest report

## 5. Sketch: platform shape (Supabase + Vercel)

Not a final schema — a starting point to refine once we scaffold:

**Data model (Postgres via Supabase)**
- `reps` (linked to `auth.users`) — role: rep / admin
- `clients` — profile fields (industry, tenure, plan, revenue, rooms, users, data volume)
- `tracked_clients` — join table: which rep tracks which client, quarter, quota enforcement
- `calls` / `tickets` — raw or lightly-processed source records (or a view into wherever these actually live today, e.g. Intercom/CRM export)
- `reports` — one row per generated client-period report: metrics snapshot (jsonb), synthesis text, expansion score + reasons, generated_at, storage path for the rendered HTML

**RLS**
- Reps: `SELECT` only on `reports`/`tracked_clients` rows where `rep_id = auth.uid()`
- Admins: full visibility

**Generation pipeline**
- Scheduled job (pg_cron or Vercel Cron) triggers, per active `tracked_clients` row nearing period end
- Pulls source data (calls/tickets) for that client + period
- Calls an LLM (via Vercel AI SDK or direct API) to summarize themes, sentiment, expansion signal
- Computes deterministic metrics (revenue, room counts, deltas vs. prior period) in SQL
- Renders HTML report (matching our existing visual style — pending the reference screenshot), stores in Supabase Storage, writes a `reports` row

**Frontend (Next.js on Vercel)**
- Rep dashboard: "track a new client" (quota-checked), list of tracked clients + report history
- Report view: rendered HTML, plus the underlying metrics for transparency
- Admin view: quota management, generation status across all reps

## 6. Open questions to resolve before/while building

- Where do call transcripts and ticket data actually come from for this exercise — do we mock realistic sample data, or is there a real (sanitized) source to pull from?
- Cadence: monthly, quarterly, or configurable per client?
- Is the expansion score a first pass at something real, or explicitly a placeholder heuristic for this exercise?
- Report output: HTML only, or also a PDF/export path?
- Visual style: reference mockup received (`demo.html` — "Account Pulse" concept). Warm editorial palette (cream bg, forest-green header gradient, rust for risk signals, tan neutral), Georgia serif headings + sans-serif body, card-grid layout (KPI strip → chart grid → voice-of-customer panels → expansion score + reasons → narrative call-out boxes), Chart.js for bar/doughnut/line/gauge visuals. We'll follow this spirit — same palette and component patterns — adapted to our actual data, not copied 1:1.

## 7. Immediate next steps

1. Finish the Supabase + Vercel learning session (see companion plan doc).
2. Share the reference HTML screenshot for visual style.
3. Scaffold the Next.js + Supabase project, starting with the smallest end-to-end slice (one client, one manually-triggered report) before adding scheduling and the full metric set.
