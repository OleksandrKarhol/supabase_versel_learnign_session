import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchClientRawData, computeClientMetrics } from "@/lib/metrics";
import { ReportView } from "./ReportView";

export default async function ClientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { client, clientError, calls, tickets, npsScores } = await fetchClientRawData(supabase, id);
  if (clientError || !client) notFound();

  const metrics = computeClientMetrics(client, calls, tickets, npsScores);

  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, generated_at, expansion_score, html_storage_path")
    .eq("client_id", id)
    .order("generated_at", { ascending: false })
    .limit(10);

  const pastReports = await Promise.all(
    (reportRows ?? []).map(async (r) => {
      const { data: signed } = await supabase.storage.from("reports").createSignedUrl(r.html_storage_path, 3600);
      return { ...r, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return <ReportView clientId={id} metrics={metrics} pastReports={pastReports} />;
}
