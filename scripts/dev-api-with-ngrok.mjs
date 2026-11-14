/**
 * Run DandanLink API and an ngrok HTTPS tunnel together with "pnpm dev:api".
 * Only local ignored apps/mobile/.env is changed; never publish server secrets.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { findHttpsApiTunnel, upsertMobileApiEnv } from "./dev-api-tunnel-utils.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const mobileEnv = resolve(root, "apps/mobile/.env");
const apiOrigin = "http://127.0.0.1:4000";
const inspector = "http://127.0.0.1:4040/api/tunnels";
const windows = process.platform === "win32";

let api;
let tunnel;
let stopping = false;

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (windows) {
    // pnpm/ngrok can have Windows cmd.exe descendants; stop the whole tree.
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  stopChild(tunnel);
  stopChild(api);
  process.exit(exitCode);
}

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

function launch(label, command, args) {
  const child = spawn(command, args, {
    cwd: root, stdio: "inherit", shell: windows,
    env: process.env
  });
  child.once("error", error => {
    if (!stopping) {
      console.error("[" + label + "] Cannot launch: " + error.message);
      stop(1);
    }
  });
  child.once("exit", (code, signal) => {
    if (!stopping) {
      console.error("[" + label + "] Exited unexpectedly (" + (signal || code) + ").");
      stop(1);
    }
  });
  return child;
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) return null;
  return response.json();
}

async function waitFor(check, child, seconds, label) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(label + " stopped before becoming ready.");
    }
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // The local service may still be starting.
    }
    await sleep(700);
  }
  throw new Error(label + " did not become ready within " + seconds + " seconds.");
}

async function main() {
  // Prevent a second API process from silently using an occupied port.
  try {
    const response = await fetch(apiOrigin + "/health", { signal: AbortSignal.timeout(1200) });
    if (response) throw new Error("Port 4000 already responds to HTTP. Stop the existing API first.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Port 4000 already")) throw error;
  }

  console.log("[api:dev] Starting DandanLink API on port 4000...");
  api = launch("api:dev", "pnpm", ["--filter", "@dandanlink/api", "dev"]);
  await waitFor(() => getJson(apiOrigin + "/health"), api, 45, "API /health");

  console.log("[ngrok] Starting: ngrok http 4000");
  tunnel = launch("ngrok", "ngrok", ["http", "4000"]);
  const publicUrl = await waitFor(
    async () => findHttpsApiTunnel(await getJson(inspector), 4000),
    tunnel, 35, "ngrok HTTPS tunnel / localhost:4040"
  );

  const previous = existsSync(mobileEnv) ? readFileSync(mobileEnv, "utf8") : "";
  writeFileSync(mobileEnv, upsertMobileApiEnv(previous, publicUrl), "utf8");

  console.log("\n[ready] API: " + apiOrigin);
  console.log("[ready] Public API: " + publicUrl);
  console.log("[ready] Updated apps/mobile/.env -> EXPO_PUBLIC_API_URL");
  console.log("[ready] Now run 'pnpm dev:mobile' in another terminal, then scan its Expo Go QR.");
  console.log("[ready] If Metro was already running, restart it to load the new URL.");
  try {
    const response = await fetch(apiOrigin + "/ready", { signal: AbortSignal.timeout(2500) });
    if (!response.ok) console.warn("[warning] API /ready is not healthy: check your DATABASE_URL and database connection.");
  } catch {
    console.warn("[warning] Could not check API /ready. Confirm your database is accessible.");
  }
}

main().catch(error => {
  console.error("[dev:api] " + (error instanceof Error ? error.message : error));
  console.error("[dev:api] Check 'ngrok version', 'ngrok config add-authtoken <TOKEN>', and localhost:4040.");
  stop(1);
});
