export type HealthSnapshot = {
  status: string;
  appName: string;
  version: string;
  timestamp: string;
  database: {
    status: string;
    product: string;
  };
  environment: string;
  mode: string;
};

export async function loadHealthStatus(): Promise<HealthSnapshot> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/health`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    return (await response.json()) as HealthSnapshot;
  } catch {
    return {
      status: "DOWN",
      appName: "OpenForge API",
      version: "unavailable",
      timestamp: new Date().toISOString(),
      database: {
        status: "DOWN",
        product: "Unavailable",
      },
      environment: import.meta.env.VITE_APP_ENV ?? "local",
      mode: import.meta.env.VITE_APP_MODE ?? "paper",
    };
  }
}
