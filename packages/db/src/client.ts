import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

// Load root-level .env regardless of the current workspace directory.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.");
export const sqlClient = postgres(url, { max: 10, prepare: false });
export const db = drizzle(sqlClient, { schema });
export { schema };
