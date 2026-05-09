import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const task = process.argv[2];

const tasks = new Set([
  "dev-db",
  "dev-db-down",
  "dev-db-reset",
  "dev-api",
  "dev-web",
  "dev-all",
  "check",
  "smoke",
  "jar",
  "jar-smoke",
]);

if (!tasks.has(task)) {
  console.error(`Unknown task: ${task ?? "(empty)"}`);
  console.error(`Available tasks: ${Array.from(tasks).join(", ")}`);
  process.exit(1);
}

function loadEnvFile() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return {};

  const content = readFile(envPath, "utf8");
  return content.then((text) => {
    const env = {};
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) continue;
      const name = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1);
      env[name] = value;
    }
    return env;
  });
}

const fileEnv = await loadEnvFile();
const env = { ...process.env, ...fileEnv };

function envOrDefault(name, defaultValue) {
  const value = env[name];
  return value == null || String(value).trim() === "" ? defaultValue : value;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? env,
      shell: false,
      stdio: options.stdio ?? "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`));
    });
  });
}

function dockerComposeArgs(args, legacy = false) {
  const composeFile = path.join(rootDir, "infra", "docker-compose.yml");
  if (legacy) return ["compose", "-p", "infra", "-f", composeFile, ...args];
  return ["compose", "--project-directory", rootDir, "-f", composeFile, ...args];
}

async function runWindowsTask() {
  await run("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "openforge.ps1"),
    task,
  ]);
}

async function waitForHttp(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function testTcpPortOpen(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) });
    const done = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

async function waitForTcpPort(host, port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await testTcpPortOpen(host, port, 1000)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for PostgreSQL at ${host}:${port}`);
}

async function ensureLocalDevDb() {
  const dbHost = envOrDefault("DB_HOST", "localhost");
  if (!isLocalHost(dbHost)) return;

  const dbPort = envOrDefault("DB_PORT", "5432");
  if (await testTcpPortOpen(dbHost, dbPort)) return;

  console.log(`Local PostgreSQL is not reachable at ${dbHost}:${dbPort}; starting dev DB...`);
  await run("docker", dockerComposeArgs(["up", "-d", "db"]));
  await waitForTcpPort(dbHost, dbPort);
}

async function assertPortAvailable(port, serviceName) {
  if (await testTcpPortOpen("localhost", port)) {
    throw new Error(`${serviceName} port ${port} is already in use.`);
  }
}

async function stopChildProcess(child) {
  if (child.exitCode != null || child.signalCode != null) return;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode == null && child.signalCode == null) child.kill("SIGKILL");
    }, 5000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function runNonWindowsTask() {
  switch (task) {
    case "dev-db":
      await run("docker", dockerComposeArgs(["up", "-d", "db"]));
      break;
    case "dev-db-down":
      await run("docker", dockerComposeArgs(["down", "--remove-orphans"]));
      await run("docker", dockerComposeArgs(["down", "--remove-orphans"], true));
      break;
    case "dev-db-reset":
      await run("docker", dockerComposeArgs(["down", "-v", "--remove-orphans"]));
      await run("docker", dockerComposeArgs(["down", "-v", "--remove-orphans"], true));
      break;
    case "dev-api":
      await run("zsh", [path.join(rootDir, "scripts", "dev-api.sh")]);
      break;
    case "dev-web":
      await run("zsh", [path.join(rootDir, "scripts", "dev-web.sh")]);
      break;
    case "dev-all":
      await run("zsh", [path.join(rootDir, "scripts", "dev-all.sh")]);
      break;
    case "check":
      await run("./gradlew", ["test", "spotlessCheck"], {
        cwd: path.join(rootDir, "apps", "api"),
      });
      await run("pnpm", ["lint"], { cwd: path.join(rootDir, "apps", "web") });
      await run("pnpm", ["typecheck"], { cwd: path.join(rootDir, "apps", "web") });
      await run("pnpm", ["test", "--run"], { cwd: path.join(rootDir, "apps", "web") });
      await run("pnpm", ["build"], { cwd: path.join(rootDir, "apps", "web") });
      break;
    case "smoke": {
      const apiPort = envOrDefault("API_PORT", "8080");
      const webPort = envOrDefault("WEB_PORT", "3000");
      await waitForHttp(`http://127.0.0.1:${apiPort}/api/v1/health`, 5000);
      await waitForHttp(`http://127.0.0.1:${webPort}`, 5000);
      console.log(`Smoke check passed for API ${apiPort} and Web ${webPort}`);
      break;
    }
    case "jar":
      await run("./gradlew", ["bootJar"], { cwd: path.join(rootDir, "apps", "api") });
      break;
    case "jar-smoke":
      await runJarSmoke();
      break;
  }
}

async function runJarSmoke() {
  await ensureLocalDevDb();
  await run("./gradlew", ["bootJar"], { cwd: path.join(rootDir, "apps", "api") });

  const jarPath = path.join(rootDir, "apps", "api", "build", "libs", "openforge-api-0.0.1-SNAPSHOT.jar");
  if (!existsSync(jarPath)) throw new Error(`Jar not found at ${jarPath}`);

  const apiPort = envOrDefault("JAR_SMOKE_PORT", "18083");
  await assertPortAvailable(apiPort, "Jar smoke");

  const logDir = path.join(rootDir, "logs", "jar-smoke");
  mkdirSync(logDir, { recursive: true });

  const jarEnv = { ...env, SERVER_PORT: apiPort, API_PORT: apiPort };
  const child = spawn("java", ["-jar", jarPath], {
    cwd: rootDir,
    env: jarEnv,
    stdio: "inherit",
  });

  try {
    await waitForHttp(`http://localhost:${apiPort}/api/v1/health`);
    for (const route of ["/", "/strategies", "/universes", "/broker/ledger", "/orders", "/positions", "/settings"]) {
      await waitForHttp(`http://localhost:${apiPort}${route}`, 5000);
    }
    const index = await waitForHttp(`http://localhost:${apiPort}/`, 5000);
    const indexHtml = await index.text();
    const assetPath = indexHtml.match(/assets\/index-[^"']+\.js/)?.[0];
    if (!assetPath) throw new Error("Vite JavaScript asset was not found in index.html.");

    const asset = await waitForHttp(`http://localhost:${apiPort}/${assetPath}`, 5000);
    const cacheControl = asset.headers.get("cache-control") ?? "";
    if (!cacheControl.includes("max-age=31536000") || !cacheControl.includes("immutable")) {
      throw new Error(`Asset ${assetPath} does not have the expected long-term cache header.`);
    }
    console.log(`Jar smoke check passed on http://localhost:${apiPort}`);
  } finally {
    await stopChildProcess(child);
  }
}

if (process.platform === "win32") {
  await runWindowsTask();
} else {
  await runNonWindowsTask();
}
