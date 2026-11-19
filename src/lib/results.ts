import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, rounds, tournaments, type Game, type Tournament } from "@/db/schema";
import type { GameResult } from "./chess-types";

/** Store a result and update round and tournament status to match. */
export async function applyResult(t: Tournament, g: Game, result: GameResult | null) {
  await db.update(games).set({ result, updatedAt: new Date() }).where(eq(games.id, g.id));
  const [{ missing }] = await db
    .select({ missing: sql<number>`count(*)::int` })
    .from(games)
    .where(and(eq(games.roundId, g.roundId), eq(games.kind, "game"), isNull(games.result)));
  await db.update(rounds).set({ status: missing === 0 ? "finished" : "paired" }).where(eq(rounds.id, g.roundId));
  const [last] = await db.select().from(rounds).where(eq(rounds.tournamentId, t.id)).orderBy(desc(rounds.number)).limit(1);
  const done = !!t.rounds && last?.number === t.rounds && last.status === "finished";
  const status = done ? "finished" : "running";
  if (t.status !== status) await db.update(tournaments).set({ status }).where(eq(tournaments.id, t.id));
}
