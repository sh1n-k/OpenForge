import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.API_PORT ?? "8080";
  const apiBaseUrl = env.API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
  const webPort = Number(env.WEB_PORT ?? env.PORT ?? "3000");

  return {
    plugins: [svelte()],
    server: {
      port: webPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: webPort,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
