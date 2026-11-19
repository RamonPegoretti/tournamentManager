import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { PlayerLite } from "@/lib/chess-types";
import { pairDutch } from "@/lib/pairing";

export const dynamic = "force-dynamic";

/** Checks the database connection and that the pairing engine runs on this host. */
export async function GET() {
  const checks: Record<string, string> = {};
  try {
    await db.execute(sql`select 1`);
    checks.database = "ok";
  } catch (e) {
    checks.database = `error: ${(e as Error).message}`;
  }
  try {
    const players: PlayerLite[] = [1, 2, 3].map((n) => ({
      id: `p${n}`, firstName: "", lastName: `P${n}`, rating: 2000 - n, fideId: null, federation: null, birthYear: null, startRank: n, status: "active",
    }));
    const pairs = await pairDutch({ name: "health", totalRounds: 3, nextRound: 1, players, games: [], preByes: [] });
    checks.pairing = pairs.length === 2 ? "ok" : `unexpected: ${JSON.stringify(pairs)}`;
  } catch (e) {
    checks.pairing = `error: ${(e as Error).message}`;
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return Response.json(checks, { status: ok ? 200 : 503 });
}
