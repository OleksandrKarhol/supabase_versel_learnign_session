import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchClientRawData, computeClientMetrics } from "@/lib/metrics";
import { renderReportHtml } from "@/lib/renderReportHtml";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { client, clientError, calls, tickets, npsScores } = await fetchClientRawData(supabase, id);
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const metrics = computeClientMetrics(client, calls, tickets, npsScores);

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 5, 1);
  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  const html = renderReportHtml(metrics, periodStartStr, periodEndStr);
  const path = `${id}/${Date.now()}.html`;

  const { error: uploadError } = await supabase.storage.from("reports").upload(path, html, {
    contentType: "text/html",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const synthesisText = metrics.narrative.map((n) => `${n.title}: ${n.body}`).join("\n\n");

  const { data: reportRow, error: insertError } = await supabase
    .from("reports")
    .insert({
      client_id: id,
      period_start: periodStartStr,
      period_end: periodEndStr,
      metrics,
      synthesis_text: synthesisText,
      expansion_score: metrics.expansionScore,
      expansion_reasons: metrics.expansionReasons,
      html_storage_path: path,
      generated_by: user.id,
    })
    .select()
    .single();

  if (insertError || !reportRow) {
    return NextResponse.json({ error: `Failed to save report row: ${insertError?.message}` }, { status: 500 });
  }

  const { data: signed } = await supabase.storage.from("reports").createSignedUrl(path, 3600);

  return NextResponse.json({ report: { ...reportRow, signedUrl: signed?.signedUrl ?? null }, signedUrl: signed?.signedUrl ?? null });
}
