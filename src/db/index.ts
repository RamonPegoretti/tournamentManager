import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// postgres() connects lazily, so a missing URL only fails when a query runs (not at build time).
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "postgres://localhost:5432/missing-database-url";

// Reuse the connection across hot reloads in development.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
const sql = globalForDb.sql ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
