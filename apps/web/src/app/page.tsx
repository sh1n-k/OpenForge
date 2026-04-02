import { DashboardClient } from "@/components/dashboard-client";
import { loadDashboard, loadSystemRisk } from "@/lib/api";

export default async function DashboardPage() {
  const [dashboard, systemRisk] = await Promise.all([
    loadDashboard(),
    loadSystemRisk(),
  ]);

  return <DashboardClient dashboard={dashboard} systemRisk={systemRisk} />;
}
