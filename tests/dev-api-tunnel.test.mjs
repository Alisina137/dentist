import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findHttpsApiTunnel, findCloudflareQuickTunnel, upsertMobileApiEnv } from "../scripts/dev-api-tunnel-utils.mjs";

test("dev:api starts a combined API and tunnel process", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts["dev:api"], "node scripts/dev-api-with-ngrok.mjs");
});

test("only an HTTPS tunnel targeting API port 4000 is selected", () => {
  const tunnels = { tunnels: [
    { public_url: "https://metro.ngrok-free.app", config: { addr: "http://localhost:8081" } },
    { public_url: "http://api.ngrok-free.app", config: { addr: "http://localhost:4000" } },
    { public_url: "https://api.ngrok-free.app/", config: { addr: "http://localhost:4000" } }
  ] };
  assert.equal(findHttpsApiTunnel(tunnels), "https://api.ngrok-free.app");
  assert.equal(findHttpsApiTunnel({ tunnels: [tunnels.tunnels[0]] }), null);
  assert.equal(findHttpsApiTunnel(null), null);
});

test("update existing Expo URL and preserve unrelated local values", () => {
  const input = "# local settings\r\nEXPO_PUBLIC_API_URL=http://localhost:4000\r\nEXPO_PUBLIC_PATIENT_WEB_URL=https://patient.example\r\nEXPO_PUBLIC_API_URL=old\r\n";
  const result = upsertMobileApiEnv(input, "https://api.ngrok-free.app");
  assert.equal((result.match(/EXPO_PUBLIC_API_URL=/g) || []).length, 1);
  assert.ok(result.includes("EXPO_PUBLIC_API_URL=https://api.ngrok-free.app\r\n"));
  assert.ok(result.includes("EXPO_PUBLIC_PATIENT_WEB_URL=https://patient.example"));
  assert.ok(result.startsWith("# local settings\r\n"));
});

test("create Expo env without injecting non-HTTPS URL", () => {
  assert.equal(upsertMobileApiEnv("", "https://new.ngrok-free.app"), "EXPO_PUBLIC_API_URL=https://new.ngrok-free.app\n");
  assert.throws(() => upsertMobileApiEnv("", "http://localhost:4000"), /HTTPS/);
});

test("Cloudflare quick tunnel URL is extracted only from the correct hostname", () => {
  const log = "2026 INFO quick tunnel established https://lively-flying-sky.trycloudflare.com and running";
  assert.equal(findCloudflareQuickTunnel(log), "https://lively-flying-sky.trycloudflare.com");
  assert.equal(findCloudflareQuickTunnel("https://metro.example.com"), null);
  assert.equal(findCloudflareQuickTunnel(null), null);
});

test("developer API launch keeps Metro and API on separate public endpoints", () => {
  const script = readFileSync(new URL("../scripts/dev-api-with-ngrok.mjs", import.meta.url), "utf8");
  assert.ok(script.includes("findHttpsApiTunnel(current, 4000)"));
  assert.ok(script.includes("startCloudflare()"));
  assert.ok(script.includes("DANDANLINK_API_TUNNEL"));
  assert.ok(script.includes("ERR_NGROK_334"));
  assert.ok(!script.includes('["http", "4000", "--pooling-enabled"]'));
});
