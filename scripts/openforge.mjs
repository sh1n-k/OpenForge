#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { Writable } from "node:stream";

const rootDir = path.resolve(import.meta.dirname, "..");
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
  console.error(`Usage: pnpm <dev:db|dev:db:down|dev:db:reset|dev:api|dev:web|dev:all|check|smoke|jar|jar:smoke>`);
  process.exit(1);
}

const env = { ...process.env, ...readEnvFile(path.join(rootDir, ".env")) };

if (process.platform === "win32") {
  await run("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "openforge.ps1"),
    task,
  ]);
  process.exit(0);
}

switch (task) {
  case "dev-db":
    await runDockerCompose(["up", "-d", "db"]);
    break;
  case "dev-db-down":
    await runDockerCompose(["down", "--remove-orphans"]);
    await runLegacyDockerCompose(["down", "--remove-orphans"]);
    break;
  case "dev-db-reset":
    await runDockerCompose(["down", "-v", "--remove-orphans"]);
    await runLegacyDockerCompose(["down", "-v", "--remove-orphans"]);
    break;
  case "dev-api":
    await startApi();
    break;
  case "dev-web":
    await startWeb();
    break;
  case "dev-all":
    await startAll();
    break;
  case "check":
    await run("./gradlew", ["test", "spotlessCheck"], { cwd: path.join(rootDir, "apps", "api") });
    await run("pnpm", ["lint"], { cwd: path.join(rootDir, "apps", "web") });
    await run("pnpm", ["typecheck"], { cwd: path.join(rootDir, "apps", "web") });
    await run("pnpm", ["test", "--run"], { cwd: path.join(rootDir, "apps", "web") });
    await run("pnpm", ["build"], { cwd: path.join(rootDir, "apps", "web") });
    break;
  case "smoke":
    await smoke();
    break;
  case "jar":
    await run("./gradlew", ["bootJar"], { cwd: path.join(rootDir, "apps", "api") });
    break;
  case "jar-smoke":
    await jarSmoke();
    break;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const name = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
        return [name, value];
      }),
  );
}

function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? env,
      stdio: options.stdio ?? "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

function dockerComposeArgs(args, legacy = false) {
  const composeFile = path.join(rootDir, "infra", "docker-compose.yml");
  if (legacy) {
    return ["compose", "-p", "infra", "-f", composeFile, ...args];
  }

  return ["compose", "--project-directory", rootDir, "-f", composeFile, ...args];
}

async function runDockerCompose(args) {
  await run("docker", dockerComposeArgs(args));
}

async function runLegacyDockerCompose(args) {
  await run("docker", dockerComposeArgs(args, true));
}

function devApiEnv() {
  const apiPort = env.API_PORT || env.SERVER_PORT || "8080";
  const webPort = env.WEB_PORT || "3000";
  const javaHome = env.JAVA_HOME || findJavaHome();
  const pathValue = javaHome ? `${path.join(javaHome, "bin")}${path.delimiter}${env.PATH || ""}` : env.PATH;

  return {
    ...env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    ...(pathValue ? { PATH: pathValue } : {}),
    API_PORT: apiPort,
    SERVER_PORT: apiPort,
    WEB_PORT: webPort,
    WEB_ORIGIN: env.WEB_ORIGIN || `http://127.0.0.1:${webPort}`,
  };
}

function devWebEnv() {
  const webPort = env.WEB_PORT || env.PORT || "3000";
  const apiPort = env.API_PORT || "8080";
  const apiBaseUrl = env.API_BASE_URL || `http://127.0.0.1:${apiPort}`;
  const viteApiBaseUrl = env.VITE_API_BASE_URL === apiBaseUrl ? "" : env.VITE_API_BASE_URL;

  return {
    ...env,
    WEB_PORT: webPort,
    PORT: webPort,
    API_PORT: apiPort,
    API_BASE_URL: apiBaseUrl,
    VITE_API_BASE_URL: viteApiBaseUrl || "",
    WEB_ORIGIN: env.WEB_ORIGIN || `http://127.0.0.1:${webPort}`,
  };
}

function findJavaHome() {
  for (const candidate of [
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home",
  ]) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const javaPath = spawnSync("zsh", ["-lc", "command -v java"], { encoding: "utf8" }).stdout.trim();
  return javaPath ? path.dirname(path.dirname(javaPath)) : "";
}

async function startApi() {
  await run("./gradlew", ["--no-daemon", "bootRun"], {
    cwd: path.join(rootDir, "apps", "api"),
    env: devApiEnv(),
  });
}

async function startWeb() {
  await run("pnpm", ["dev"], {
    cwd: path.join(rootDir, "apps", "web"),
    env: devWebEnv(),
  });
}

async function startAll() {
  const children = new Set();
  let shuttingDown = false;

  const stopAll = () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const child of children) {
      terminateChild(child);
    }
  };

  process.once("SIGINT", () => {
    stopAll();
  });
  process.once("SIGTERM", () => {
    stopAll();
  });

  const apiProcess = spawnPrefixed("api", "\u001b[36m", "./gradlew", ["--no-daemon", "bootRun"], {
    cwd: path.join(rootDir, "apps", "api"),
    env: devApiEnv(),
  });
  children.add(apiProcess);

  await sleep(2_000);

  if (apiProcess.exitCode !== null) {
    stopAll();
    throw new Error("API process exited before Web startup.");
  }

  const webProcess = spawnPrefixed("web", "\u001b[35m", "pnpm", ["dev"], {
    cwd: path.join(rootDir, "apps", "web"),
    env: devWebEnv(),
  });
  children.add(webProcess);

  await new Promise((resolve, reject) => {
    const onExit = (name, code, signal) => {
      stopAll();
      if (shuttingDown && (signal === "SIGTERM" || signal === "SIGINT")) {
        resolve();
        return;
      }

      const detail = signal ?? `exit code ${code}`;
      reject(new Error(`${name} process exited with ${detail}`));
    };

    apiProcess.once("exit", (code, signal) => onExit("API", code, signal));
    webProcess.once("exit", (code, signal) => onExit("Web", code, signal));
  });
}

function spawnPrefixed(name, color, command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    detached: true,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.pipe(createPrefixStream(name, color, process.stdout));
  child.stderr.pipe(createPrefixStream(name, color, process.stdout));
  child.once("exit", () => {
    child.stdout.destroy();
    child.stderr.destroy();
  });

  return child;
}

function createPrefixStream(name, color, output) {
  let pending = "";
  const enabled = colorEnabled();
  const prefix = enabled ? `${color}[${name}]\u001b[0m ` : `[${name}] `;

  return new Writable({
    write(chunk, _encoding, callback) {
      pending += chunk.toString();
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";

      for (const line of lines) {
        output.write(`${prefix}${line}\n`);
      }

      callback();
    },
    final(callback) {
      if (pending) {
        output.write(`${prefix}${pending}\n`);
        pending = "";
      }

      callback();
    },
  });
}

function colorEnabled() {
  return !env.NO_COLOR && env.TERM !== "dumb";
}

function terminateChild(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // Process already exited.
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoke() {
  const apiPort = env.API_PORT || "8080";
  const webPort = env.WEB_PORT || "3000";
  const apiUrl = `http://127.0.0.1:${apiPort}/api/v1/health`;
  const webUrl = `http://127.0.0.1:${webPort}`;

  await expectOk(apiUrl);
  await expectOk(webUrl, { method: "HEAD" });
  console.log(`Smoke check passed for ${apiUrl} and ${webUrl}`);
}

async function jarSmoke() {
  await runDockerCompose(["up", "-d", "db"]);
  await run("./gradlew", ["bootJar"], { cwd: path.join(rootDir, "apps", "api") });

  const apiPort = env.JAR_SMOKE_PORT || "18083";
  if (await isPortOpen("127.0.0.1", Number(apiPort))) {
    throw new Error(`Jar smoke cannot start because port ${apiPort} is already in use.`);
  }

  const jarPath = path.join(rootDir, "apps", "api", "build", "libs", "openforge-api-0.0.1-SNAPSHOT.jar");
  if (!fs.existsSync(jarPath)) {
    throw new Error(`Jar not found at ${jarPath}`);
  }

  const jarEnv = { ...env, API_PORT: apiPort, SERVER_PORT: apiPort };
  const child = spawn("java", ["-jar", jarPath], {
    cwd: rootDir,
    env: jarEnv,
    stdio: "inherit",
  });

  try {
    const baseUrl = `http://127.0.0.1:${apiPort}`;
    await waitForOk(`${baseUrl}/api/v1/health`, 90_000);

    for (const route of ["/", "/strategies", "/universes", "/broker/ledger", "/orders", "/positions", "/settings"]) {
      await expectOk(`${baseUrl}${route}`);
    }

    const index = await fetchText(`${baseUrl}/`);
    const assetPath = index.match(/assets\/index-[^"']+\.js/)?.[0];
    if (!assetPath) {
      throw new Error("Vite JavaScript asset was not found in index.html.");
    }

    const asset = await fetch(`${baseUrl}/${assetPath}`);
    if (!asset.ok) {
      throw new Error(`Asset ${assetPath} returned ${asset.status}.`);
    }

    const cacheControl = asset.headers.get("cache-control") || "";
    if (!cacheControl.includes("max-age=31536000") || !cacheControl.includes("immutable")) {
      throw new Error(`Asset ${assetPath} does not have the expected long-term cache header.`);
    }

    console.log(`Jar smoke check passed on ${baseUrl}`);
  } finally {
    child.kill("SIGTERM");
  }
}

async function waitForOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await expectOk(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function expectOk(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1_000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}
