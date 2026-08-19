import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchClientRawData } from "@/lib/metrics";
import { DataExplorer } from "./DataExplorer";

export default async function ClientDataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { client, clientError, calls, tickets, npsScores } = await fetchClientRawData(supabase, id);
  if (clientError || !client) notFound();

  return (
    <div>
      <p className="mb-4 text-xs" style={{ color: "var(--ink-soft)" }}>
        Raw records behind the report — filter and browse calls, tickets, and NPS/CSAT readings.
      </p>
      <DataExplorer calls={calls} tickets={tickets} npsScores={npsScores} />
    </div>
  );
}
