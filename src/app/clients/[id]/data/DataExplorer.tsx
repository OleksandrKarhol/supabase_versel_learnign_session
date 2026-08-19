"use client";

import { useMemo, useState } from "react";
import type { Call, NpsScore, Ticket } from "@/lib/metrics";

type Tab = "calls" | "tickets" | "nps";

const sentimentPill = (s: string) => {
  const bg = s === "negative" ? "#f6e6e0" : s === "positive" ? "#eef2ec" : "#f3f0e6";
  const color = s === "negative" ? "var(--rust)" : s === "positive" ? "var(--green-mid)" : "var(--ink-soft)";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: bg, color }}>
      {s}
    </span>
  );
};

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-soft)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border bg-white px-2 py-1 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--ink)" }}
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DataExplorer({ calls, tickets, npsScores }: { calls: Call[]; tickets: Ticket[]; npsScores: NpsScore[] }) {
  const [tab, setTab] = useState<Tab>("calls");

  const [callType, setCallType] = useState("all");
  const [callSentiment, setCallSentiment] = useState("all");
  const [callSearch, setCallSearch] = useState("");

  const [ticketTheme, setTicketTheme] = useState("all");
  const [ticketSentiment, setTicketSentiment] = useState("all");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");

  const ticketThemes = useMemo(() => Array.from(new Set(tickets.map((t) => t.theme))).sort(), [tickets]);

  const filteredCalls = useMemo(() => {
    return [...calls]
      .filter((c) => callType === "all" || c.type === callType)
      .filter((c) => callSentiment === "all" || c.sentiment === callSentiment)
      .filter((c) => callSearch === "" || c.summary.toLowerCase().includes(callSearch.toLowerCase()))
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [calls, callType, callSentiment, callSearch]);

  const filteredTickets = useMemo(() => {
    return [...tickets]
      .filter((t) => ticketTheme === "all" || t.theme === ticketTheme)
      .filter((t) => ticketSentiment === "all" || t.sentiment === ticketSentiment)
      .filter((t) => ticketStatus === "all" || (ticketStatus === "open" ? !t.resolved_at : !!t.resolved_at))
      .filter((t) => ticketSearch === "" || t.subject.toLowerCase().includes(ticketSearch.toLowerCase()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, ticketTheme, ticketSentiment, ticketStatus, ticketSearch]);

  const sortedNps = useMemo(
    () => [...npsScores].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()),
    [npsScores]
  );

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className="rounded px-3 py-1.5 text-sm font-medium"
      style={tab === t ? { background: "var(--green-mid)", color: "white" } : { color: "var(--ink-soft)" }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {tabBtn("calls", `Calls (${calls.length})`)}
        {tabBtn("tickets", `Tickets (${tickets.length})`)}
        {tabBtn("nps", `NPS / CSAT (${npsScores.length})`)}
      </div>

      {tab === "calls" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <Select value={callType} onChange={setCallType} options={["sales", "cs"]} label="Type" />
            <Select value={callSentiment} onChange={setCallSentiment} options={["positive", "neutral", "negative"]} label="Sentiment" />
            <input
              value={callSearch}
              onChange={(e) => setCallSearch(e.target.value)}
              placeholder="Search summary…"
              className="rounded border bg-white px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ background: "var(--tan)" }}>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Summary</th>
                  <th className="px-3 py-2 font-semibold">Competitors</th>
                  <th className="px-3 py-2 font-semibold">Features</th>
                  <th className="px-3 py-2 font-semibold">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((c, i) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "#faf8f2" : "white" }}>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(c.occurred_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 uppercase" style={{ color: "var(--ink-soft)" }}>{c.type}</td>
                    <td className="px-3 py-2">{c.summary}</td>
                    <td className="px-3 py-2">{c.competitors_mentioned.join(", ") || "—"}</td>
                    <td className="px-3 py-2">{c.features_mentioned.join(", ") || "—"}</td>
                    <td className="px-3 py-2">{sentimentPill(c.sentiment)}</td>
                  </tr>
                ))}
                {filteredCalls.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                      No calls match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "tickets" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <Select value={ticketTheme} onChange={setTicketTheme} options={ticketThemes} label="Theme" />
            <Select value={ticketSentiment} onChange={setTicketSentiment} options={["positive", "neutral", "negative"]} label="Sentiment" />
            <Select value={ticketStatus} onChange={setTicketStatus} options={["open", "resolved"]} label="Status" />
            <input
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Search subject…"
              className="rounded border bg-white px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ background: "var(--tan)" }}>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Theme</th>
                  <th className="px-3 py-2 font-semibold">Sentiment</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t, i) => (
                  <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "#faf8f2" : "white" }}>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{t.subject}</td>
                    <td className="px-3 py-2" style={{ color: "var(--ink-soft)" }}>{t.theme}</td>
                    <td className="px-3 py-2">{sentimentPill(t.sentiment)}</td>
                    <td className="px-3 py-2">
                      {t.resolved_at ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#eef2ec", color: "var(--green-mid)" }}>
                          resolved
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#f6e6e0", color: "var(--rust)" }}>
                          open
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                      No tickets match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "nps" && (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: "var(--tan)" }}>
                <th className="px-3 py-2 font-semibold">Recorded</th>
                <th className="px-3 py-2 font-semibold">NPS</th>
                <th className="px-3 py-2 font-semibold">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {sortedNps.map((n, i) => (
                <tr key={n.id} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "#faf8f2" : "white" }}>
                  <td className="px-3 py-2">{new Date(n.recorded_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{n.score}</td>
                  <td className="px-3 py-2">{n.csat}%</td>
                </tr>
              ))}
              {sortedNps.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                    No NPS/CSAT records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
