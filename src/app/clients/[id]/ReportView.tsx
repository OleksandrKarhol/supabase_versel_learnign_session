"use client";

import { useState } from "react";
import type { ClientMetrics } from "@/lib/metrics";
import { ChartCanvas } from "@/components/ChartCanvas";

const GREEN = "#2f4a3d";
const GREEN_MID = "#3d6650";
const TAN = "#d9c9a3";
const RUST = "#b8462f";
const RUST_SOFT = "#c96a4d";
const SOFT_GRID = "rgba(38,54,45,0.08)";

type PastReport = {
  id: string;
  generated_at: string;
  expansion_score: number;
  html_storage_path: string;
  signedUrl: string | null;
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border bg-white ${className}`}
      style={{ borderColor: "var(--border)", boxShadow: "0 1px 3px rgba(38,54,45,0.06)" }}
    >
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, rust }: { label: string; value: string; sub?: string; rust?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-soft)" }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: rust ? "var(--rust)" : "var(--green-dark)" }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-[11px]" style={{ color: rust ? "var(--rust)" : "var(--ink-soft)" }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-center text-[12.5px] font-bold" style={{ color: "var(--ink)" }}>
      {children}
    </h3>
  );
}

export function ReportView({
  clientId,
  metrics,
  pastReports,
}: {
  clientId: string;
  metrics: ClientMetrics;
  pastReports: PastReport[];
}) {
  const { client, kpis } = metrics;
  const [reports, setReports] = useState(pastReports);
  const [regenerating, setRegenerating] = useState(false);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate-report`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to regenerate report");
      setReports((prev) => [body.report, ...prev]);
      setLatestLink(body.signedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate report");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
          Live report — computed from the current calls, tickets, and NPS data below.
        </div>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--green-mid)" }}
        >
          {regenerating ? "Regenerating…" : "Regenerate report"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded border p-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--rust)" }}>
          {error}
        </p>
      )}
      {latestLink && (
        <p className="mb-4 rounded border p-3 text-sm" style={{ borderColor: "var(--border)", background: "#eef2ec" }}>
          Snapshot saved.{" "}
          <a href={latestLink} target="_blank" rel="noreferrer" className="font-semibold underline">
            View stored HTML snapshot
          </a>
        </p>
      )}

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Plan" value={client.plan ?? "—"} sub={client.customer_since ? `Customer since ${client.customer_since.slice(0, 7)}` : undefined} />
        <Kpi label="Active Rooms" value={String(client.active_rooms)} sub={`${client.total_rooms} opened all-time`} />
        <Kpi label="Total Users" value={String(client.total_users)} />
        <Kpi label="Data Volume" value={`${Number(client.data_volume_gb).toLocaleString()} GB`} />
        <Kpi label="ARR" value={`$${Number(client.arr).toLocaleString()}`} />
        <Kpi
          label="CSAT (latest)"
          value={kpis.csatLatest !== null ? `${kpis.csatLatest}%` : "—"}
          rust={kpis.csatDeltaVsPrior !== null && kpis.csatDeltaVsPrior < 0}
          sub={
            kpis.csatDeltaVsPrior !== null
              ? `${kpis.csatDeltaVsPrior >= 0 ? "↑" : "↓"} ${Math.abs(kpis.csatDeltaVsPrior)} pts vs prior month`
              : undefined
          }
        />
      </div>

      <h2 className="mb-3 text-base font-bold">Account Health &amp; Support Signal</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <PanelTitle>Support Ticket Volume</PanelTitle>
          <ChartCanvas
            config={{
              type: "bar",
              data: {
                labels: metrics.ticketVolumeByMonth.map((m) => m.label),
                datasets: [
                  {
                    data: metrics.ticketVolumeByMonth.map((m) => m.count),
                    backgroundColor: metrics.ticketVolumeByMonth.map((m, i, arr) =>
                      i === arr.length - 1 && m.count > (arr[i - 1]?.count ?? 0) ? RUST : TAN
                    ),
                    borderRadius: 3,
                    maxBarThickness: 36,
                  },
                ],
              },
              options: {
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { grid: { color: SOFT_GRID }, beginAtZero: true } },
              },
            }}
          />
        </Card>

        <Card className="p-4">
          <PanelTitle>Ticket Themes</PanelTitle>
          <ChartCanvas
            config={{
              type: "doughnut",
              data: {
                labels: metrics.ticketThemes.map((t) => t.theme),
                datasets: [
                  {
                    data: metrics.ticketThemes.map((t) => t.count),
                    backgroundColor: [RUST, TAN, GREEN, GREEN_MID, RUST_SOFT, "#8a9a8f"],
                    borderWidth: 2,
                    borderColor: "#fff",
                  },
                ],
              },
              options: {
                cutout: "62%",
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
              },
            }}
          />
        </Card>

        <Card className="p-4">
          <PanelTitle>CSAT / NPS Trend</PanelTitle>
          <ChartCanvas
            config={{
              type: "line",
              data: {
                labels: metrics.csatNpsTrend.map((t) => t.label),
                datasets: [
                  {
                    label: "CSAT %",
                    data: metrics.csatNpsTrend.map((t) => t.csat),
                    borderColor: RUST,
                    backgroundColor: "rgba(184,70,47,0.12)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                  },
                  {
                    label: "NPS",
                    data: metrics.csatNpsTrend.map((t) => t.nps),
                    borderColor: GREEN,
                    backgroundColor: "transparent",
                    tension: 0.35,
                    pointRadius: 3,
                    borderDash: [4, 3],
                  },
                ],
              },
              options: {
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
                scales: { x: { grid: { display: false } }, y: { grid: { color: SOFT_GRID } } },
              },
            }}
          />
        </Card>
      </div>

      <h2 className="mb-3 text-base font-bold">Voice of the Customer</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-4">
          <PanelTitle>Competitors Mentioned</PanelTitle>
          {metrics.competitorsMentioned.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--ink-soft)" }}>
              No competitor mentions in recent calls.
            </p>
          ) : (
            <ChartCanvas
              height={Math.max(120, metrics.competitorsMentioned.length * 32)}
              config={{
                type: "bar",
                data: {
                  labels: metrics.competitorsMentioned.map((c) => c.name),
                  datasets: [{ data: metrics.competitorsMentioned.map((c) => c.count), backgroundColor: GREEN, borderRadius: 3, maxBarThickness: 28 }],
                },
                options: {
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { color: SOFT_GRID }, beginAtZero: true }, y: { grid: { display: false } } },
                },
              }}
            />
          )}
        </Card>
        <Card className="p-4">
          <PanelTitle>Features Discussed</PanelTitle>
          {metrics.featuresDiscussed.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--ink-soft)" }}>
              No specific features flagged in recent calls.
            </p>
          ) : (
            <ChartCanvas
              height={Math.max(120, metrics.featuresDiscussed.length * 28)}
              config={{
                type: "bar",
                data: {
                  labels: metrics.featuresDiscussed.map((f) => f.name),
                  datasets: [{ data: metrics.featuresDiscussed.map((f) => f.count), backgroundColor: RUST_SOFT, borderRadius: 3, maxBarThickness: 24 }],
                },
                options: {
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { color: SOFT_GRID }, beginAtZero: true }, y: { grid: { display: false } } },
                },
              }}
            />
          )}
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-[12.5px] font-bold">Recurring Pain Points</h3>
          <ul className="text-sm">
            {metrics.recurringPainPoints.length === 0 && (
              <li className="py-2" style={{ color: "var(--ink-soft)" }}>No repeated ticket themes yet.</li>
            )}
            {metrics.recurringPainPoints.map((p) => (
              <li
                key={p.theme}
                className="flex items-baseline justify-between border-b py-2 last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{p.subject}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: p.count >= 5 ? "#f6e6e0" : "#eef2ec", color: p.count >= 5 ? "var(--rust)" : "var(--green-mid)" }}
                >
                  {p.count} mentions
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-[12.5px] font-bold">Expansion Signal (Raw Mentions)</h3>
          <ul className="text-sm">
            {metrics.expansionSignals.length === 0 && (
              <li className="py-2" style={{ color: "var(--ink-soft)" }}>No positive-sentiment calls yet.</li>
            )}
            {metrics.expansionSignals.map((s, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{s.summary}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#eef2ec", color: "var(--green-mid)" }}
                >
                  {s.type === "cs" ? "CS call" : "Sales"}, {new Date(s.occurred_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-bold">Expansion Potential</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center p-6">
          <div className="relative" style={{ height: 130, width: 130 }}>
            <ChartCanvas
              height={130}
              config={{
                type: "doughnut",
                data: { datasets: [{ data: [metrics.expansionScore, 100 - metrics.expansionScore], backgroundColor: [GREEN, "#ece7d8"], borderWidth: 0 }] },
                options: { cutout: "76%", rotation: -90, circumference: 360, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-bold" style={{ color: "var(--green-dark)" }}>
              {metrics.expansionScore}
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-soft)" }}>
            Expansion Likelihood / 100
          </div>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <h3 className="mb-2 text-[12.5px] font-bold">Why this score</h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {metrics.expansionReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-bold">Summary &amp; Recommended Actions</h2>
      <div className="mb-6 space-y-3">
        {metrics.narrative.map((n, i) => (
          <div
            key={i}
            className="rounded-lg border p-4 text-sm"
            style={{
              background: "linear-gradient(135deg, #fbf8ef, #f3ede0)",
              borderColor: "var(--border)",
              borderLeft: `4px solid ${n.kind === "risk" ? "var(--rust)" : "var(--green-mid)"}`,
            }}
          >
            <span className="mb-1.5 block text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-soft)" }}>
              {n.kind === "risk" ? "⚠ " : "↑ "}
              {n.title}
            </span>
            {n.body}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-base font-bold">Report Snapshots</h2>
      <Card className="p-4">
        {reports.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            No snapshots yet — click &quot;Regenerate report&quot; above to render and store the first one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                <th className="pb-2 font-semibold">Generated</th>
                <th className="pb-2 font-semibold">Expansion Score</th>
                <th className="pb-2 font-semibold">Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2">{new Date(r.generated_at).toLocaleString()}</td>
                  <td className="py-2">{r.expansion_score}</td>
                  <td className="py-2">
                    {r.signedUrl ? (
                      <a href={r.signedUrl} target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: "var(--green-mid)" }}>
                        View snapshot
                      </a>
                    ) : (
                      <code className="text-xs" style={{ color: "var(--ink-soft)" }}>
                        {r.html_storage_path}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
