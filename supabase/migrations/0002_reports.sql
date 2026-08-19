-- Client Pulse — Phase 2: raw data tables, reports, and the reports Storage bucket.
-- Applies via the Supabase GitHub integration on push to main.

-- ---------------------------------------------------------------------------
-- calls — sales + CS call log per client
-- ---------------------------------------------------------------------------
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('sales', 'cs')),
  occurred_at timestamptz not null,
  summary text not null,
  competitors_mentioned text[] not null default '{}',
  features_mentioned text[] not null default '{}',
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

create policy "calls_select_authenticated"
  on public.calls for select
  to authenticated
  using (true);

create index calls_client_id_idx on public.calls (client_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- tickets — support tickets per client
-- ---------------------------------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  subject text not null,
  theme text not null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  created_at timestamptz not null,
  resolved_at timestamptz
);

alter table public.tickets enable row level security;

create policy "tickets_select_authenticated"
  on public.tickets for select
  to authenticated
  using (true);

create index tickets_client_id_idx on public.tickets (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- nps_scores — monthly NPS/CSAT reading per client
-- ---------------------------------------------------------------------------
create table public.nps_scores (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  score integer not null check (score between -100 and 100),
  csat numeric not null check (csat between 0 and 100),
  recorded_at date not null
);

alter table public.nps_scores enable row level security;

create policy "nps_scores_select_authenticated"
  on public.nps_scores for select
  to authenticated
  using (true);

create index nps_scores_client_id_idx on public.nps_scores (client_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- reports — a generated report snapshot: computed metrics + stored HTML
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  synthesis_text text not null,
  expansion_score integer not null check (expansion_score between 0 and 100),
  expansion_reasons jsonb not null default '[]',
  html_storage_path text not null,
  generated_at timestamptz not null default now(),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  generated_by uuid references auth.users (id)
);

alter table public.reports enable row level security;

create policy "reports_select_authenticated"
  on public.reports for select
  to authenticated
  using (true);

create policy "reports_insert_authenticated"
  on public.reports for insert
  to authenticated
  with check (true);

create index reports_client_id_idx on public.reports (client_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- Storage bucket for generated report HTML snapshots (private — served via
-- signed URLs, not public, since these are client-account documents).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

create policy "reports_bucket_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reports');

create policy "reports_bucket_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports');

-- ---------------------------------------------------------------------------
-- Seed data — ~6 months of synthetic calls, tickets, and NPS/CSAT per client.
-- Built with generate_series + random() rather than hand-written rows.
-- Meridian Capital Partners gets an explicit, deliberately declining trend
-- (rising "bulk download timeout" tickets, dropping CSAT/NPS) so the report
-- page has a visible risk narrative to show — mirroring demo.html, which is
-- itself a mockup of this same account.
-- ---------------------------------------------------------------------------

-- Baseline calls for every client, every month.
insert into public.calls (client_id, type, occurred_at, summary, competitors_mentioned, features_mentioned, sentiment)
select
  c.id,
  (array['sales', 'cs'])[1 + floor(random() * 2)::int],
  date_trunc('month', now()) - (m || ' months')::interval
    + (floor(random() * 27) || ' days')::interval
    + (floor(random() * 23) || ' hours')::interval,
  (array[
    'Quarterly check-in on usage and renewal outlook',
    'Walked through setting up a new deal room',
    'Discussed onboarding for new advisor seats',
    'Reviewed data room permission structure with IT lead',
    'Follow-up on a reported performance issue',
    'Demo of the redaction workflow for the legal team',
    'Pricing and contract term discussion',
    'General relationship check-in, no open issues'
  ])[1 + floor(random() * 8)::int],
  case when random() < 0.2
    then array[(array['Datasite', 'Intralinks', 'Ansarada', 'Firmex', 'DealRoom'])[1 + floor(random() * 5)::int]]
    else '{}'::text[]
  end,
  case when random() < 0.3
    then array[(array['SSO / SCIM', 'Bulk download speed', 'Redaction on scans', 'AI Q&A in room', 'Advisor permission groups', 'API integration', 'Audit trail', 'Mobile app'])[1 + floor(random() * 8)::int]]
    else '{}'::text[]
  end,
  (array['positive', 'neutral', 'negative'])[1 + floor(random() * 3)::int]
from public.clients c
cross join generate_series(0, 5) as m
cross join lateral generate_series(1, 2 + floor(random() * 3)::int) as call_n(n);

-- Baseline tickets for every client, every month, drawn from a fixed topic list.
with ticket_topics (theme, subject) as (
  values
    ('Bulk download timeout', 'Bulk download timing out on a large data room'),
    ('Redaction tool performance', 'Redaction tool slow on scanned PDFs'),
    ('Permission group confusion', 'Confusing permission groups for external advisors'),
    ('SSO/SCIM request', 'Requesting SSO / SCIM provisioning'),
    ('Billing/admin', 'Question about invoice or seat count'),
    ('Search/indexing issue', 'Search not returning recently uploaded files'),
    ('Data export', 'Need bulk export in a different file format'),
    ('API integration issue', 'API token expiring unexpectedly'),
    ('Mobile access', 'Mobile app login issue'),
    ('Audit log request', 'Requesting extended audit log retention')
)
insert into public.tickets (client_id, subject, theme, sentiment, created_at, resolved_at)
select
  c.id,
  t.subject,
  t.theme,
  (array['positive', 'neutral', 'negative'])[1 + floor(random() * 3)::int],
  gen_ts.ts,
  case when random() < 0.75 then gen_ts.ts + (1 + floor(random() * 5) || ' days')::interval else null end
from public.clients c
cross join generate_series(0, 5) as m
cross join lateral generate_series(1, 1 + floor(random() * 3)::int) as ticket_n(n)
cross join lateral (
  select date_trunc('month', now()) - (m || ' months')::interval + (floor(random() * 27) || ' days')::interval as ts
) gen_ts
cross join lateral (
  select theme, subject from ticket_topics order by random() limit 1
) t;

-- Baseline monthly NPS/CSAT for every client except Meridian (which gets an
-- explicit declining trend below).
insert into public.nps_scores (client_id, score, csat, recorded_at)
select
  c.id,
  30 + floor(random() * 35)::int,
  round((78 + random() * 14)::numeric, 1),
  (date_trunc('month', now()) - (m || ' months')::interval + interval '20 days')::date
from public.clients c
cross join generate_series(0, 5) as m
where c.name <> 'Meridian Capital Partners';

-- Meridian: explicit declining CSAT/NPS trend, oldest (m=5) to newest (m=0).
insert into public.nps_scores (client_id, score, csat, recorded_at)
select
  c.id,
  v.score,
  v.csat,
  (date_trunc('month', now()) - (v.m || ' months')::interval + interval '20 days')::date
from public.clients c
cross join (values
  (5, 44, 87.0),
  (4, 41, 85.0),
  (3, 40, 83.0),
  (2, 37, 79.0),
  (1, 35, 76.0),
  (0, 33, 71.0)
) as v(m, score, csat)
where c.name = 'Meridian Capital Partners';

-- Meridian: extra tickets concentrated in the last two months, matching the
-- "recurring pain points" narrative in demo.html (7 / 5 / 4 / 3 mentions).
insert into public.tickets (client_id, subject, theme, sentiment, created_at, resolved_at)
select
  c.id,
  x.subject,
  x.theme,
  'negative',
  date_trunc('month', now()) - (x.m || ' months')::interval + (floor(random() * 27) || ' days')::interval,
  case when random() < 0.4
    then date_trunc('month', now()) - (x.m || ' months')::interval + interval '3 days'
    else null
  end
from public.clients c
cross join lateral (values
  (0, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (0, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (0, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (1, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (1, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (1, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (1, 'Bulk download timing out on a large data room', 'Bulk download timeout'),
  (0, 'Redaction tool slow on scanned PDFs', 'Redaction tool performance'),
  (0, 'Redaction tool slow on scanned PDFs', 'Redaction tool performance'),
  (1, 'Redaction tool slow on scanned PDFs', 'Redaction tool performance'),
  (1, 'Redaction tool slow on scanned PDFs', 'Redaction tool performance'),
  (0, 'Redaction tool slow on scanned PDFs', 'Redaction tool performance'),
  (0, 'Confusing permission groups for external advisors', 'Permission group confusion'),
  (1, 'Confusing permission groups for external advisors', 'Permission group confusion'),
  (1, 'Confusing permission groups for external advisors', 'Permission group confusion'),
  (0, 'Confusing permission groups for external advisors', 'Permission group confusion'),
  (2, 'Requesting SSO / SCIM provisioning', 'SSO/SCIM request'),
  (1, 'Requesting SSO / SCIM provisioning', 'SSO/SCIM request'),
  (0, 'Requesting SSO / SCIM provisioning', 'SSO/SCIM request')
) as x(m, subject, theme)
where c.name = 'Meridian Capital Partners';

-- Meridian: explicit calls carrying competitor/feature mentions and the
-- expansion-signal narrative (repository interest, 2nd deal room, etc).
insert into public.calls (client_id, type, occurred_at, summary, competitors_mentioned, features_mentioned, sentiment)
select
  c.id,
  x.call_type,
  now() - (x.days_ago || ' days')::interval,
  x.summary,
  x.competitors,
  x.features,
  x.sentiment
from public.clients c
cross join lateral (values
  ('cs', 10, 'Asked about long-term document repository pricing', array[]::text[], array['AI Q&A in room']::text[], 'positive'),
  ('cs', 45, 'Mentioned evaluating us for internal governance docs', array[]::text[], array['Audit trail']::text[], 'positive'),
  ('sales', 8, 'New deal team requested a room — 2nd this quarter', array[]::text[], array[]::text[], 'positive'),
  ('sales', 70, 'Asked about multi-year contract terms', array[]::text[], array[]::text[], 'positive'),
  ('cs', 5, 'Client compared bulk download speed to a competitor tool', array['Datasite']::text[], array['Bulk download speed']::text[], 'negative'),
  ('cs', 12, 'Discussed switching cost vs. an alternative VDR', array['Datasite']::text[], array[]::text[], 'neutral'),
  ('sales', 20, 'Competitive evaluation mentioned during renewal talk', array['Intralinks']::text[], array[]::text[], 'neutral'),
  ('cs', 30, 'Client referenced a competitor''s redaction workflow', array['Ansarada']::text[], array['Redaction on scans']::text[], 'neutral'),
  ('cs', 40, 'Brief mention of another provider during onboarding', array['Firmex']::text[], array[]::text[], 'neutral'),
  ('sales', 15, 'Discussed SSO rollout timeline', array[]::text[], array['SSO / SCIM']::text[], 'neutral'),
  ('cs', 25, 'Advisor permission structure walkthrough', array[]::text[], array['Advisor permission groups']::text[], 'neutral')
) as x(call_type, days_ago, summary, competitors, features, sentiment)
where c.name = 'Meridian Capital Partners';
