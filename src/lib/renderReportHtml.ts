import type { ClientMetrics } from "./metrics";

/**
 * Renders the stored HTML snapshot for a report. This is a static,
 * self-contained document (no client JS needed) — simple CSS bars stand in
 * for the interactive Chart.js charts on the live report page, since a
 * Storage snapshot should be viewable on its own.
 */
export function renderReportHtml(metrics: ClientMetrics, periodStart: string, periodEnd: string): string {
  const { client, kpis } = metrics;
  const maxTicket = Math.max(1, ...metrics.ticketVolumeByMonth.map((m) => m.count));
  const maxTheme = Math.max(1, ...metrics.ticketThemes.map((t) => t.count));
  const maxCompetitor = Math.max(1, ...metrics.competitorsMentioned.map((c) => c.count));
  const maxFeature = Math.max(1, ...metrics.featuresDiscussed.map((f) => f.count));

  const bar = (label: string, count: number, max: number, color: string) => `
    <div style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;">
        <span>${label}</span><span style="color:#5c6a60;">${count}</span>
      </div>
      <div style="background:#ece7d8; border-radius:4px; height:8px;">
        <div style="background:${color}; width:${Math.max(4, (count / max) * 100)}%; height:8px; border-radius:4px;"></div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Client Pulse — ${client.name}</title>
<style>
  :root{
    --bg:#f7f4ec; --card-bg:#ffffff; --header-bg:#2c4638; --header-bg-2:#35543f;
    --ink:#26362d; --ink-soft:#5c6a60; --green-dark:#2f4a3d; --green-mid:#3d6650;
    --tan:#d9c9a3; --rust:#b8462f; --border:#e7e1d2;
  }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); font-family:Georgia,'Times New Roman',serif; color:var(--ink); }
  .header{ background:linear-gradient(135deg,var(--header-bg),var(--header-bg-2)); color:#f4f1e6; padding:22px 32px; }
  .header h1{ margin:0 0 4px; font-size:24px; }
  .header p{ margin:0; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:#cfd8cd; }
  .wrap{ padding:22px 32px 40px; max-width:1100px; margin:0 auto; }
  .kpi-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
  .card{ background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:14px 16px; }
  .kpi .label{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10px; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px; }
  .kpi .value{ font-size:22px; font-weight:700; color:var(--green-dark); }
  .kpi .value.rust{ color:var(--rust); }
  .section-title{ font-size:15px; font-weight:700; margin:26px 0 10px; }
  .grid-2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  h3{ font-size:12.5px; margin:0 0 10px; }
  ul{ margin:0; padding:0; list-style:none; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12.5px; }
  li{ display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--border); }
  li:last-child{ border-bottom:none; }
  .pill{ font-size:10px; padding:2px 7px; border-radius:10px; background:#eef2ec; color:var(--green-mid); font-weight:600; }
  .pill.rust{ background:#f6e6e0; color:var(--rust); }
  .narrative{ background:linear-gradient(135deg,#fbf8ef,#f3ede0); border:1px solid var(--border); border-left:4px solid var(--rust); border-radius:8px; padding:14px 18px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:13px; margin-bottom:12px; }
  .narrative.positive{ border-left-color:var(--green-mid); }
  .score{ font-size:40px; font-weight:700; color:var(--green-dark); }
  .footer-note{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10.5px; color:var(--ink-soft); text-align:center; margin-top:24px; }
</style>
</head>
<body>
<div class="header">
  <h1>Client Pulse — ${client.name}</h1>
  <p>Account Intelligence Snapshot · ${periodStart} – ${periodEnd} · Generated ${new Date().toLocaleString()}</p>
</div>
<div class="wrap">
  <div class="kpi-row">
    <div class="card kpi"><div class="label">Plan</div><div class="value" style="font-size:18px;">${client.plan ?? "—"}</div></div>
    <div class="card kpi"><div class="label">ARR</div><div class="value">$${Number(client.arr).toLocaleString()}</div></div>
    <div class="card kpi"><div class="label">CSAT (latest)</div><div class="value${kpis.csatDeltaVsPrior !== null && kpis.csatDeltaVsPrior < 0 ? " rust" : ""}">${kpis.csatLatest ?? "—"}%</div></div>
  </div>

  <div class="section-title">Support Ticket Volume (last 6 months)</div>
  <div class="card">
    ${metrics.ticketVolumeByMonth.map((m) => bar(m.label, m.count, maxTicket, "#d9c9a3")).join("")}
  </div>

  <div class="grid-2" style="margin-top:14px;">
    <div class="card">
      <h3>Ticket Themes</h3>
      ${metrics.ticketThemes.map((t) => bar(t.theme, t.count, maxTheme, "#b8462f")).join("") || "<p>No tickets yet.</p>"}
    </div>
    <div class="card">
      <h3>Competitors Mentioned</h3>
      ${metrics.competitorsMentioned.map((c) => bar(c.name, c.count, maxCompetitor, "#2f4a3d")).join("") || "<p>No competitor mentions.</p>"}
    </div>
  </div>

  <div class="grid-2" style="margin-top:14px;">
    <div class="card">
      <h3>Features Discussed</h3>
      ${metrics.featuresDiscussed.map((f) => bar(f.name, f.count, maxFeature, "#c96a4d")).join("") || "<p>No features flagged.</p>"}
    </div>
    <div class="card">
      <h3>Recurring Pain Points</h3>
      <ul>
        ${metrics.recurringPainPoints
          .map(
            (p) =>
              `<li><span>${p.subject}</span><span class="pill${p.count >= 5 ? " rust" : ""}">${p.count} mentions</span></li>`
          )
          .join("") || "<li>No repeated themes yet.</li>"}
      </ul>
    </div>
  </div>

  <div class="section-title">Expansion Potential</div>
  <div class="grid-2">
    <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <div class="score">${metrics.expansionScore}</div>
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:11px; text-transform:uppercase; color:var(--ink-soft); margin-top:6px;">Expansion Likelihood / 100</div>
    </div>
    <div class="card">
      <h3>Why this score</h3>
      <ol style="font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; padding-left:18px; line-height:1.6;">
        ${metrics.expansionReasons.map((r) => `<li>${r}</li>`).join("")}
      </ol>
    </div>
  </div>

  <div class="section-title">Summary &amp; Recommended Actions</div>
  ${metrics.narrative
    .map(
      (n) =>
        `<div class="narrative${n.kind === "opportunity" ? " positive" : ""}"><strong>${n.title}.</strong> ${n.body}</div>`
    )
    .join("")}

  <div class="footer-note">Client Pulse · Stored report snapshot · Illustrative synthetic data</div>
</div>
</body>
</html>`;
}
