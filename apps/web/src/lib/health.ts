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

const defaultApiPort = process.env.API_PORT ?? "8080";
const defaultBaseUrl = `http://127.0.0.1:${defaultApiPort}`;

export async function loadHealthStatus(): Promise<HealthSnapshot> {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? defaultBaseUrl}/api/v1/health`,
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
      environment: process.env.APP_ENV ?? "local",
      mode: process.env.APP_MODE ?? "paper",
    };
  }
}
