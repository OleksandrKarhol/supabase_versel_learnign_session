# Learning Session: Supabase + Vercel, via "Client Pulse"

**Format:** ~60–75 min, hands-on, using our own project (Client Pulse reporting platform) as the running example instead of a toy app.
**Audience:** you (data analyst / AI engineer), learning the Supabase + Vercel stack.
**Not covered:** Git/GitHub mechanics (assumed known or out of scope).

The throughline: every concept is introduced *because the reporting platform needs it*, not in the abstract. We build understanding by pointing at the actual piece of the architecture that will use it.

---

## 0. Framing (5 min)

- What we're building today conceptually: a platform that generates per-client "health check" reports for CS/Sales, on a schedule, using AI over calls/tickets/CRM data.
- Why use this as the vehicle for the lesson: it touches almost every primitive Supabase + Vercel offer — relational data, auth/roles, scheduled jobs, AI calls, file/HTML generation, storage — so it's a realistic tour, not a todo-list app.
- The question we're really answering today: **"why is Supabase + Vercel a legitimate choice for a production-ish internal tool, vs. the GCP-style stack we're used to?"**

---

## 1. The traditional stack, as a baseline (10 min)

Quickly sketch what "doing this on GCP" (or AWS) would typically involve, since that's the mental model to contrast against:

- **Compute:** Cloud Run / GKE — you pick a container runtime, write a Dockerfile, manage a build pipeline, configure scaling policies, VPC networking.
- **Database:** Cloud SQL (Postgres) — provision an instance, configure private IP / VPC peering, manage connection pooling (Cloud SQL Proxy or PgBouncer), set up backups, patch versions.
- **Auth:** either roll your own, or wire up Identity Platform / Firebase Auth as a *separate* product from your DB, then propagate identity into Postgres RLS-equivalent logic yourself (Postgres has no built-in concept of a Google/Firebase user).
- **Scheduled jobs:** Cloud Scheduler → Pub/Sub → Cloud Function/Run, three products wired together for a cron job.
- **Secrets/config:** Secret Manager, IAM bindings per service account, per environment.
- **Deploys:** Cloud Build triggers, artifact registry, IAM for the pipeline itself.
- **Cost/ops shape:** you are the one operating a database (patching, connection limits, backups, HA config) and stitching together 5-6 IAM-gated products to do things that feel like they should be one thing.

Point to make explicit: none of this is *hard*, it's just a lot of **integration surface** — each piece is a separate product with its own IAM model, and the "glue" is where time and bugs go for a small team.

---

## 2. Supabase: Postgres, but batteries-included (15 min)

Live in the Supabase dashboard for this section.

- **It's just Postgres.** No proprietary query language — this matters for us specifically because we already think in SQL for analytics. Anything you'd do in Cloud SQL you can do here, plus:
- **Row Level Security (RLS) as the access-control primitive.** Instead of enforcing "a CS manager can only see their assigned clients' reports" in application code, you write a Postgres policy once, and it's enforced no matter what queries the app runs. Show a concrete policy for our `clients` / `reports` tables.
- **Auth is built on the same Postgres instance.** `auth.users` sits next to your own tables, so `auth.uid()` can be referenced directly in an RLS policy — auth and data aren't two products you have to reconcile.
- **Storage** — for us: this is where generated HTML/PDF reports and any uploaded transcript files live, with the same RLS model applying to buckets.
- **Edge Functions** — Deno-based serverless functions colocated with the DB, for things like "call the LLM to summarize this month's tickets" without standing up a separate compute product.
- **pg_cron / scheduled jobs** — runs *inside* Postgres. This directly replaces the Cloud Scheduler → Pub/Sub → Cloud Function chain with one SQL statement.
- **Realtime** (mention briefly) — subscribe to table changes, e.g. to show "report generation in progress" live in the UI.

Key teaching moment: in GCP, "database," "auth," "file storage," "scheduled jobs," and "serverless functions" are five products with five IAM surfaces. In Supabase they're one project with one set of policies, because they all sit on Postgres.

---

## 3. Vercel: deploys and edge, without the pipeline (10 min)

- **Git push → live URL.** No Dockerfile, no Cloud Build trigger, no artifact registry to configure for a standard Next.js/React app. (We're told to skip GitHub mechanics, but it's worth naming that this *is* the CI/CD pipeline — it's just invisible.)
- **Preview deployments per branch/PR** — every change gets its own URL automatically; this is the thing that usually takes real setup on GCP (traffic splitting / separate Cloud Run revisions).
- **Serverless + Edge Functions** — API routes deploy as functions automatically; no separate "define a Cloud Run service, configure concurrency, configure the load balancer."
- **Environment variables per environment** (Production/Preview/Development) via dashboard, mapped automatically — the equivalent of Secret Manager + per-env IAM, but scoped to the project instead of the whole cloud org.
- **Cron Jobs on Vercel** — for triggering our monthly/quarterly report generation, as an alternative or complement to `pg_cron`.
- **Vercel AI SDK** (mention if time allows) — standardizes calling Claude/OpenAI from the app, streaming responses, structured output — relevant since the reports are AI-generated.

---

## 4. Why this combination, specifically (10 min)

Bring it back to a direct comparison, now that both sides have been shown concretely:

| Concern | GCP-style stack | Supabase + Vercel |
|---|---|---|
| DB + Auth + Storage | 3 separate products, reconciled in app code | 1 Postgres project, RLS is the shared enforcement layer |
| Access control | App-layer checks, easy to bypass via a forgotten endpoint | RLS policy, enforced at the DB no matter the entry point |
| Scheduled job | Scheduler + Pub/Sub + Function (3 IAM bindings) | 1 SQL `cron.schedule(...)` call, or 1 Vercel cron config |
| Deploy pipeline | Dockerfile, Cloud Build, Artifact Registry | `git push`, done |
| Preview environments | Manual traffic config | Automatic per branch |
| Who's on the hook for DB ops | You (patching, pooling, backups) | Managed |
| Where it stops making sense | — | Very high-scale, highly custom infra, multi-region write-heavy workloads, deep GCP-ecosystem lock-in (BigQuery, Dataflow, etc.) |

The honest caveat to state out loud: this stack trades some ceiling (raw infra control, GCP-ecosystem integrations we might already depend on for other analytics work) for a much lower floor (time-to-first-deploy, IAM complexity, number of products you need to hold in your head). For an internal reporting tool for a defined set of CS/Sales users, that trade is clearly worth it; for a system that needs to plug into an existing BigQuery/Dataflow pipeline at scale, it's a real conversation.

---

## 5. Hands-on: stand up the skeleton (15–20 min)

If time allows, end with actually doing it rather than just talking about it:

1. Create a Supabase project, look at the auto-generated `auth.users` table.
2. Create one table (`clients`) and one RLS policy live, query it via the Supabase client from a Next.js route.
3. Deploy that Next.js app to Vercel via `git push`, see the preview URL appear.
4. Set one environment variable in Vercel and read it in the deployed function, to show the env-var flow end to end.

This is intentionally the *smallest possible slice* of the full Client Pulse platform — just enough to have touched every layer once (DB, RLS, deploy, env vars) before we build the real thing in a follow-up session.

---

## Suggested time-box if running exactly 60 min

- Framing: 5 min
- Traditional stack baseline: 8 min
- Supabase deep-dive: 15 min
- Vercel deep-dive: 8 min
- Comparison + honest trade-offs: 8 min
- Hands-on skeleton: 16 min

(Push hands-on to a second session if the comparison discussion runs long — that's the part worth not rushing.)
