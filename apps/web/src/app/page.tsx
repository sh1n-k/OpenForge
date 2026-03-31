import { ConsoleShell } from "@/components/console-shell";
import { loadHealthStatus } from "@/lib/health";

export default async function Home() {
  const health = await loadHealthStatus();

  return (
    <ConsoleShell
      environment={process.env.APP_ENV ?? health.environment}
      mode={process.env.APP_MODE ?? health.mode}
      health={health}
    />
  );
}
