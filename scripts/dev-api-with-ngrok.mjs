/**
 * Starts DandanLink API and selects a dedicated, reachable public API tunnel.
 *
 * Expo's --tunnel uses ngrok too. ngrok accounts with a single development
 * domain cannot point that same domain at BOTH Expo Metro (8081) and API
 * (4000). Reuse an already running local API ngrok tunnel when possible;
 * otherwise fall back to a separate Cloudflare Quick Tunnel on conflict.
 * Do not enable ngrok pooling: Metro and API are different services.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { findHttpsApiTunnel, findCloudflareQuickTunnel, upsertMobileApiEnv } from "./dev-api-tunnel-utils.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const mobileEnv = resolve(root, "apps/mobile/.env");
const apiOrigin = "http://127.0.0.1:4000";
const inspector = "http://127.0.0.1:4040/api/tunnels";
const windows = process.platform === "win32";
const providerPreference = (process.env.DANDANLINK_API_TUNNEL || "auto").toLowerCase();

let api;
let ownedTunnel;
let stopping = false;

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (windows) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  stopChild(ownedTunnel);
  stopChild(api);
  process.exit(exitCode);
}
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

function launch(label, command, args, pipe = false) {
  const child = spawn(command, args, {
    cwd: root, env: process.env, shell: windows,
    stdio: pipe ? ["inherit", "pipe", "pipe"] : "inherit",
    windowsHide: true
  });
  child.output = "";
  child.launchError = null;
  child.once("error", error => {
    child.launchError = error;
    if (label === "API" && !stopping) {
      console.error("[API] Cannot launch: " + error.message);
      stop(1);
    }
  });
  if (pipe) {
    for (const stream of ["stdout", "stderr"]) {
      child[stream]?.on("data", data => {
        const chunk = data.toString("utf8");
        child.output = (child.output + chunk).slice(-24000);
        (stream === "stderr" ? process.stderr : process.stdout).write(chunk);
      });
    }
  }
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
    if (child.launchError || child.exitCode !== null || child.signalCode !== null) {
      throw new Error(label + " exited before it was ready.");
    }
    try {
      const found = await check();
      if (found) return found;
    } catch {
      // Waiting for a local service or tunnel to become available.
    }
    await sleep(700);
  }
  throw new Error(label + " did not become ready within " + seconds + " seconds.");
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    cwd: root, shell: windows, stdio: "ignore", windowsHide: true
  });
  return !result.error && result.status === 0;
}

async function localTunnels() {
  try {
    const response = await getJson(inspector);
    return Array.isArray(response?.tunnels) ? response : null;
  } catch {
    return null;
  }
}

async function startNgrok() {
  console.info("[ngrok] Starting: ngrok http 4000");
  const child = launch("ngrok", "ngrok", ["http", "4000"], true);
  try {
    const url = await waitFor(async () => {
      const tunnels = await localTunnels();
      return findHttpsApiTunnel(tunnels, 4000);
    }, child, 35, "ngrok API tunnel");
    return { url, child, provider: "ngrok" };
  } catch (error) {
    stopChild(child);
    const collision = child.output.includes("ERR_NGROK_334");
    if (collision) {
      console.warn("[ngrok] ERR_NGROK_334: your development endpoint is already in use.");
      console.warn("[ngrok] This may be the Expo Go --tunnel endpoint (Metro port 8081).");
    } else {
      console.warn("[ngrok] Could not create a separate API endpoint: " + error.message);
    }
    return null;
  }
}

async function startCloudflare() {
  if (!commandExists("cloudflared")) {
    throw new Error(
      "ngrok endpoint is occupied and cloudflared is not installed. " +
      "Install it on Windows using 'winget install -e --id Cloudflare.cloudflared', " +
      "open a new terminal, then retry. Cloudflare Quick Tunnel needs no login. " +
      "Alternatively, stop the other ngrok session and run Expo in --lan mode."
    );
  }
  console.info("[cloudflare] Starting separate API tunnel on port 4000...");
  const child = launch("cloudflared", "cloudflared", ["tunnel", "--url", apiOrigin], true);
  try {
    const url = await waitFor(
      () => findCloudflareQuickTunnel(child.output),
      child, 45, "Cloudflare Quick Tunnel"
    );
    return { url, child, provider: "Cloudflare Quick Tunnel" };
  } catch (error) {
    stopChild(child);
    throw new Error("Cloudflare API tunnel failed to start: " + error.message);
  }
}

async function chooseTunnel() {
  if (!["auto", "ngrok", "cloudflare"].includes(providerPreference)) {
    throw new Error("DANDANLINK_API_TUNNEL must be auto, ngrok, or cloudflare.");
  }

  // Expo's --tunnel also relies on ngrok. Prefer a different provider for
  // the API, even when the API command starts before Expo. Otherwise Expo
  // may fail later with ERR_NGROK_334 on the account's single dev domain.
  if (providerPreference === "auto" && commandExists("cloudflared")) {
    try {
      console.info("[api:dev] Using Cloudflare for API; reserving ngrok for Expo's --tunnel.");
      return await startCloudflare();
    } catch (error) {
      console.warn("[cloudflare] " + error.message);
      console.warn("[api:dev] Attempting ngrok API as fallback; Expo may require --lan.");
    }
  }

  if (providerPreference !== "cloudflare") {
    const current = await localTunnels();
    const reusable = findHttpsApiTunnel(current, 4000);
    if (reusable) {
      console.info("[ngrok] Reusing existing local tunnel targeting port 4000.");
      return { url: reusable, child: null, provider: "existing ngrok" };
    }

    const expoIsUsingNgrok = Boolean(current?.tunnels?.length);
    if (providerPreference === "auto" && expoIsUsingNgrok && commandExists("cloudflared")) {
      console.info("[ngrok] An existing local ngrok tunnel points elsewhere (likely Expo Metro).");
      console.info("[ngrok] Using Cloudflare for API to avoid the domain conflict.");
      return startCloudflare();
    }
    const ngrok = await startNgrok();
    if (ngrok) return ngrok;
    if (providerPreference === "ngrok") {
      throw new Error(
        "ngrok endpoint already in use or unavailable. Stop the conflicting ngrok session, " +
        "or unset DANDANLINK_API_TUNNEL to permit Cloudflare fallback."
      );
    }
  }
  return startCloudflare();
}

async function main() {
  try {
    // A previous API server must be stopped so the managed one owns port 4000.
    const response = await fetch(apiOrigin + "/health", { signal: AbortSignal.timeout(1200) });
    if (response) throw new Error("Port 4000 already responds to HTTP. Stop the existing API first.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Port 4000 already")) throw error;
  }

  console.info("[api:dev] Starting DandanLink API on port 4000...");
  api = launch("API", "pnpm", ["--filter", "@dandanlink/api", "dev"]);
  api.once("exit", (code, signal) => {
    if (!stopping) {
      console.error("[API] Exited unexpectedly (" + (signal || code) + ").");
      stop(1);
    }
  });
  await waitFor(() => getJson(apiOrigin + "/health"), api, 45, "API /health");

  const selected = await chooseTunnel();
  ownedTunnel = selected.child;
  if (ownedTunnel) {
    ownedTunnel.once("exit", (code, signal) => {
      if (!stopping) {
        console.error("[tunnel] Exited unexpectedly (" + (signal || code) + ").");
        stop(1);
      }
    });
  }

  const previous = existsSync(mobileEnv) ? readFileSync(mobileEnv, "utf8") : "";
  writeFileSync(mobileEnv, upsertMobileApiEnv(previous, selected.url), "utf8");

  console.info("\n[ready] API: " + apiOrigin);
  console.info("[ready] Public API (" + selected.provider + "): " + selected.url);
  console.info("[ready] Updated apps/mobile/.env -> EXPO_PUBLIC_API_URL");
  console.info("[ready] Run 'pnpm dev:mobile' in another terminal. If Metro was running, restart it.");
  console.info("[ready] Keep this terminal open. The API and API tunnel stop together.");
  try {
    const response = await fetch(apiOrigin + "/ready", { signal: AbortSignal.timeout(2500) });
    if (!response.ok) console.warn("[warning] API /ready is not healthy: check DATABASE_URL.");
  } catch {
    console.warn("[warning] Could not check API /ready. Check your database.");
  }
}

main().catch(error => {
  console.error("[dev:api] " + (error instanceof Error ? error.message : error));
  console.error("[dev:api] Do NOT use --pooling-enabled for Metro and the API: they need different URLs.");
  stop(1);
});
