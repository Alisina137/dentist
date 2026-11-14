/**
 * Development-only ngrok URL discovery and Expo environment synchronization.
 * Keep this separate from the process launcher so it can be unit tested.
 */
export function findHttpsApiTunnel(payload, port = 4000) {
  if (!Array.isArray(payload?.tunnels)) return null;
  for (const tunnel of payload.tunnels) {
    const url = tunnel?.public_url;
    const address = String(tunnel?.config?.addr ?? "").replace(/\/+$/, "");
    if (typeof url !== "string" || !url.startsWith("https://")) continue;
    if (address === String(port) || address.endsWith(":" + port)) {
      return url.replace(/\/+$/, "");
    }
  }
  return null;
}

/** Preserve every unrelated local setting (including PATIENT_WEB_URL). */
export function upsertMobileApiEnv(contents, publicUrl) {
  const parsed = new URL(publicUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Expected an HTTPS API tunnel URL");
  }
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const lines = contents ? contents.split(/\r?\n/) : [];
  const updated = [];
  let replaced = false;

  for (const line of lines) {
    if (/^\s*EXPO_PUBLIC_API_URL\s*=/.test(line)) {
      if (!replaced) {
        updated.push("EXPO_PUBLIC_API_URL=" + parsed.origin);
        replaced = true;
      }
    } else {
      updated.push(line);
    }
  }
  if (!replaced) updated.push("EXPO_PUBLIC_API_URL=" + parsed.origin);
  return updated.join(newline).replace(/(?:\r?\n)*$/, "") + newline;
}

/** Cloudflare Quick Tunnel prints its temporary URL to stderr on startup. */
export function findCloudflareQuickTunnel(logText) {
  if (typeof logText !== "string") return null;
  const match = logText.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i);
  return match ? match[0] : null;
}
