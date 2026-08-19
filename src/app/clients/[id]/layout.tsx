import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentQuarter } from "@/lib/quarter";
import { ClientTabs } from "./ClientTabs";
import { TrackToggle } from "./TrackToggle";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, industry, plan")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const quarter = currentQuarter();
  const { data: myTracked } = await supabase
    .from("tracked_clients")
    .select("client_id")
    .eq("rep_id", user!.id)
    .eq("quarter", quarter);

  const isTracked = (myTracked ?? []).some((t) => t.client_id === id);
  const remaining = 10 - (myTracked?.length ?? 0);

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-start justify-between px-8 py-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--header-bg), var(--header-bg-2))" }}
      >
        <div>
          <Link href="/dashboard" className="text-xs opacity-70 hover:opacity-100">
            ← Client Directory
          </Link>
          <h1 className="mt-1 text-xl font-bold">{client.name}</h1>
          <p className="text-xs opacity-80">
            {client.industry} · {client.plan}
          </p>
          <ClientTabs id={id} />
        </div>
        <TrackToggle clientId={id} quarter={quarter} userId={user!.id} initialTracked={isTracked} initialRemaining={remaining} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
