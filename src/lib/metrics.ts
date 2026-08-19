import type { SupabaseClient } from "@supabase/supabase-js";

export type Call = {
  id: string;
  type: "sales" | "cs";
  occurred_at: string;
  summary: string;
  competitors_mentioned: string[];
  features_mentioned: string[];
  sentiment: "positive" | "neutral" | "negative";
};

export type Ticket = {
  id: string;
  subject: string;
  theme: string;
  sentiment: "positive" | "neutral" | "negative";
  created_at: string;
  resolved_at: string | null;
};

export type NpsScore = {
  id: string;
  score: number;
  csat: number;
  recorded_at: string;
};

export type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  plan: string | null;
  customer_since: string | null;
  arr: number;
  active_rooms: number;
  total_rooms: number;
  total_users: number;
  data_volume_gb: number;
};

export type ClientMetrics = {
  client: ClientRow;
  kpis: {
    csatLatest: number | null;
    csatDeltaVsPrior: number | null;
    npsLatest: number | null;
  };
  ticketVolumeByMonth: { label: string; count: number }[];
  ticketThemes: { theme: string; count: number }[];
  csatNpsTrend: { label: string; csat: number | null; nps: number | null }[];
  competitorsMentioned: { name: string; count: number }[];
  featuresDiscussed: { name: string; count: number }[];
  recurringPainPoints: { subject: string; theme: string; count: number }[];
  expansionSignals: { summary: string; type: "sales" | "cs"; occurred_at: string }[];
  expansionScore: number;
  expansionReasons: string[];
  narrative: { kind: "risk" | "opportunity"; title: string; body: string }[];
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return MONTH_LABELS[d.getMonth()];
}

/** Last 6 calendar months, oldest first, as {key, label} so callers can bucket into them. */
function lastSixMonths() {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] });
  }
  return months;
}

function count<T>(items: T[], keyFn: (item: T) => string): { name: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return Array.from(tally.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchClientRawData(supabase: SupabaseClient, clientId: string) {
  const [clientRes, callsRes, ticketsRes, npsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("calls").select("*").eq("client_id", clientId).order("occurred_at", { ascending: true }),
    supabase.from("tickets").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
    supabase.from("nps_scores").select("*").eq("client_id", clientId).order("recorded_at", { ascending: true }),
  ]);

  return {
    client: clientRes.data as ClientRow | null,
    clientError: clientRes.error,
    calls: (callsRes.data ?? []) as Call[],
    tickets: (ticketsRes.data ?? []) as Ticket[],
    npsScores: (npsRes.data ?? []) as NpsScore[],
  };
}

/**
 * Computes every report metric with plain logic over the raw rows — no LLM
 * call. This is intentionally deterministic and re-runnable: calling it
 * twice on the same data always produces the same report.
 */
export function computeClientMetrics(
  client: ClientRow,
  calls: Call[],
  tickets: Ticket[],
  npsScores: NpsScore[]
): ClientMetrics {
  const months = lastSixMonths();

  const ticketVolumeByMonth = months.map(({ key, label }) => ({
    label,
    count: tickets.filter((t) => monthKey(t.created_at) === key).length,
  }));

  const ticketThemes = count(tickets, (t) => t.theme).map((t) => ({ theme: t.name, count: t.count }));

  const npsByMonth = new Map(npsScores.map((n) => [monthKey(n.recorded_at), n]));
  const csatNpsTrend = months.map(({ key, label }) => {
    const row = npsByMonth.get(key);
    return { label, csat: row ? Number(row.csat) : null, nps: row ? row.score : null };
  });

  const sortedNps = [...npsScores].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const latest = sortedNps.at(-1) ?? null;
  const prior = sortedNps.at(-2) ?? null;

  const competitorsMentioned = count(
    calls.flatMap((c) => c.competitors_mentioned),
    (name) => name
  );
  const featuresDiscussed = count(
    calls.flatMap((c) => c.features_mentioned),
    (name) => name
  );

  const painPointCounts = new Map<string, { subject: string; theme: string; count: number }>();
  for (const t of tickets) {
    const existing = painPointCounts.get(t.theme);
    if (existing) existing.count += 1;
    else painPointCounts.set(t.theme, { subject: t.subject, theme: t.theme, count: 1 });
  }
  const recurringPainPoints = Array.from(painPointCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const expansionSignals = calls
    .filter((c) => c.sentiment === "positive")
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 5)
    .map((c) => ({ summary: c.summary, type: c.type, occurred_at: c.occurred_at }));

  // --- Expansion score: plain point-based scoring, fully explainable ---
  let score = 50;
  const reasons: string[] = [];

  const highAdoptionIndustries = ["Financial Services / M&A", "Financial Services", "Legal Services"];
  if (client.industry && highAdoptionIndustries.includes(client.industry)) {
    score += 10;
    reasons.push(`${client.industry} accounts historically show high multi-use-case adoption in our book.`);
  }

  if (client.plan === "Enterprise") {
    score += 10;
    reasons.push("Enterprise tier — strong existing commercial relationship to build on.");
  }

  const recentPositiveCalls = calls.filter(
    (c) =>
      c.sentiment === "positive" &&
      Date.now() - new Date(c.occurred_at).getTime() < 1000 * 60 * 60 * 24 * 90
  ).length;
  if (recentPositiveCalls >= 2) {
    score += 15;
    reasons.push(
      `${recentPositiveCalls} positive-sentiment calls in the last quarter, including explicit expansion interest.`
    );
  } else if (recentPositiveCalls === 1) {
    score += 7;
    reasons.push("One recent positive-sentiment call touched on expansion interest.");
  }

  const distinctCompetitors = competitorsMentioned.length;
  if (distinctCompetitors === 0) {
    score += 8;
    reasons.push("No competitor mentions in recent calls — low competitive threat.");
  } else if (distinctCompetitors >= 3) {
    score -= 10;
    reasons.push(`${distinctCompetitors} distinct competitors mentioned across recent calls — active competitive shopping.`);
  }

  if (latest && prior && latest.csat < prior.csat - 5) {
    score -= 15;
    reasons.push(`CSAT dropped ${Math.round(prior.csat - latest.csat)} points month over month — renewal risk to address first.`);
  } else if (latest && latest.csat >= 85) {
    score += 5;
    reasons.push(`CSAT is strong at ${Math.round(latest.csat)}%.`);
  }

  const recentTicketCount = ticketVolumeByMonth.at(-1)?.count ?? 0;
  const priorTicketCount = ticketVolumeByMonth.at(-2)?.count ?? 0;
  if (priorTicketCount > 0 && recentTicketCount > priorTicketCount * 1.5) {
    score -= 8;
    reasons.push(
      `Ticket volume rose from ${priorTicketCount} to ${recentTicketCount} month over month — support friction may slow an expansion conversation.`
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (reasons.length === 0) reasons.push("Baseline score — no strong signals in either direction this period.");

  // --- Narrative call-outs ---
  const narrative: ClientMetrics["narrative"] = [];

  if (latest && prior && latest.csat < prior.csat - 5 && recentTicketCount > priorTicketCount) {
    const topTheme = recurringPainPoints[0];
    narrative.push({
      kind: "risk",
      title: "Risk flag",
      body: `CSAT dropped ${Math.round(prior.csat - latest.csat)} points this month, coinciding with a rise in support tickets${
        topTheme ? ` referencing "${topTheme.theme.toLowerCase()}"` : ""
      }. Recommend flagging to Product before the account's next QBR.`,
    });
  }

  if (expansionSignals.length > 0) {
    const s = expansionSignals[0];
    narrative.push({
      kind: "opportunity",
      title: "Expansion opportunity",
      body: `Recent ${s.type === "cs" ? "CS" : "sales"} activity shows expansion signal: "${s.summary.toLowerCase()}." Recommend AE follow-up to scope this ahead of renewal.`,
    });
  }

  if (narrative.length === 0) {
    narrative.push({
      kind: "opportunity",
      title: "Steady state",
      body: "No strong risk or expansion signal this period — account is tracking steady. Revisit at the next quarterly check-in.",
    });
  }

  return {
    client,
    kpis: {
      csatLatest: latest ? Number(latest.csat) : null,
      csatDeltaVsPrior: latest && prior ? Number((latest.csat - prior.csat).toFixed(1)) : null,
      npsLatest: latest ? latest.score : null,
    },
    ticketVolumeByMonth,
    ticketThemes,
    csatNpsTrend,
    competitorsMentioned: competitorsMentioned.map((c) => ({ name: c.name, count: c.count })),
    featuresDiscussed: featuresDiscussed.map((f) => ({ name: f.name, count: f.count })),
    recurringPainPoints,
    expansionSignals,
    expansionScore: score,
    expansionReasons: reasons,
    narrative,
  };
}

export { monthLabel };
