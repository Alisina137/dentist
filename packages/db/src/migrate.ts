import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sqlClient } from "./client.js";

const folder = fileURLToPath(new URL("../migrations/", import.meta.url));
await sqlClient.unsafe("CREATE TABLE IF NOT EXISTS _dandan_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
const migrations = (await readdir(folder)).filter(name => name.endsWith(".sql")).sort();
try {
  for (const name of migrations) {
    const existing = await sqlClient.unsafe("SELECT name FROM _dandan_migrations WHERE name = $1", [name]);
    if (existing.length) continue;
    const script = await readFile(fileURLToPath(new URL("../migrations/" + name, import.meta.url)), "utf8");
    await sqlClient.begin(async tx => {
      await tx.unsafe(script, [], { prepare: false });
      await tx.unsafe("INSERT INTO _dandan_migrations (name) VALUES ($1)", [name]);
    });
    console.log("Applied migration:", name);
  }
} finally {
  await sqlClient.end();
}
