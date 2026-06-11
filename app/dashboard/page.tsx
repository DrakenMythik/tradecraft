import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { createClient } from "@/lib/supabase/server";
import type { StrategyRecord } from "@/lib/types/strategy";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <DashboardClient
      email={user.email}
      initialStrategies={(data ?? []) as StrategyRecord[]}
      userId={user.id}
    />
  );
}
