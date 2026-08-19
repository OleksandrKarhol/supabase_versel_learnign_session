import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientTabs } from "./ClientTabs";

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

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="px-8 py-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--header-bg), var(--header-bg-2))" }}
      >
        <Link href="/dashboard" className="text-xs opacity-70 hover:opacity-100">
          ← Client Directory
        </Link>
        <h1 className="mt-1 text-xl font-bold">{client.name}</h1>
        <p className="text-xs opacity-80">
          {client.industry} · {client.plan}
        </p>
        <ClientTabs id={id} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
