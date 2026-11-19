"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { games, players, rounds, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { RESULTS, type GameResult } from "@/lib/chess-types";
import { PairingError, pairDutch } from "@/lib/pairing";
import { applyResult } from "@/lib/results";
import { getOwnedTournament, loadEventData } from "@/lib/tournaments";

export type ActionResult = { error?: string; detail?: string; ok?: boolean };

function revalidateEvent(id: string, slug: string) {
  revalidatePath(`/dashboard/t/${id}`, "layout");
  revalidatePath(`/t/${slug}`, "layout");
}

export async function pairNextRound(tournamentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  if (t.format !== "swiss") return { error: "formatNotReady" };
  const data = await loadEventData(t.id);
  const next = data.currentRound + 1;
  if (t.rounds && next > t.rounds) return { error: "allRoundsPaired" };
  if (data.currentRound > 0 && data.rounds[data.rounds.length - 1].status !== "finished") return { error: "resultsMissing" };
  const active = data.players.filter((p) => p.status === "active");
  if (active.length < 2) return { error: "notEnoughPlayers" };
  if (data.currentRound === 0 && active.some((p) => !p.approved)) return { error: "notApproved" };

  // Pairing numbers: before round 1 everyone is ranked by rating (unrated last), then name.
  // Later entries keep existing numbers and are appended at the end.
  let playerLites = data.playerLites;
  if (data.currentRound === 0 || data.players.some((p) => p.startRank === null)) {
    const byRating = (a: (typeof data.players)[number], b: (typeof data.players)[number]) =>
      (b.rating ?? -1) - (a.rating ?? -1) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    const order =
      data.currentRound === 0
        ? [...data.players].sort(byRating)
        : [
            ...data.players.filter((p) => p.startRank !== null).sort((a, b) => a.startRank! - b.startRank!),
            ...data.players.filter((p) => p.startRank === null).sort(byRating),
          ];
    const rankOf = new Map(order.map((p, i) => [p.id, i + 1]));
    playerLites = playerLites.map((p) => ({ ...p, startRank: rankOf.get(p.id)! }));
    await db.transaction(async (tx) => {
      for (const p of order) await tx.update(players).set({ startRank: rankOf.get(p.id)! }).where(eq(players.id, p.id));
    });
  }

  let pairs;
  try {
    pairs = await pairDutch({
      name: t.name,
      totalRounds: t.rounds ?? Math.max(next, 5),
      nextRound: next,
      players: playerLites,
      games: data.gameLites,
      preByes: [],
    });
  } catch (e) {
    if (e instanceof PairingError) return { error: "engine", detail: e.message };
    throw e;
  }

  await db.transaction(async (tx) => {
    const [round] = await tx.insert(rounds).values({ tournamentId: t.id, number: next }).returning();
    await tx.insert(games).values(
      pairs.map((p) => ({ tournamentId: t.id, roundId: round.id, round: next, board: p.board, kind: p.kind, whiteId: p.whiteId, blackId: p.blackId })),
    );
    // A round made only of byes is complete straight away.
    if (pairs.every((p) => p.kind !== "game")) await tx.update(rounds).set({ status: "finished" }).where(eq(rounds.id, round.id));
    if (t.status !== "running" || t.registrationOpen)
      await tx.update(tournaments).set({ status: "running", registrationOpen: false }).where(eq(tournaments.id, t.id));
  });
  revalidateEvent(t.id, t.slug);
  return { ok: true };
}

/** Deletes the latest round, only while none of its results are entered. */
export async function unpairLastRound(tournamentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const [last] = await db.select().from(rounds).where(eq(rounds.tournamentId, t.id)).orderBy(desc(rounds.number)).limit(1);
  if (!last) return { error: "noRound" };
  const [{ entered }] = await db
    .select({ entered: sql<number>`count(*)::int` })
    .from(games)
    .where(and(eq(games.roundId, last.id), eq(games.kind, "game"), sql`${games.result} is not null`));
  if (entered > 0) return { error: "resultsEntered" };
  await db.delete(rounds).where(eq(rounds.id, last.id));
  if (last.number === 1) await db.update(tournaments).set({ status: "draft" }).where(eq(tournaments.id, t.id));
  else if (t.status === "finished") await db.update(tournaments).set({ status: "running" }).where(eq(tournaments.id, t.id));
  revalidateEvent(t.id, t.slug);
  return { ok: true };
}

export async function setResult(tournamentId: string, gameId: string, result: GameResult | null): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  if (result !== null && !RESULTS.includes(result)) return { error: "badResult" };
  const [g] = await db.select().from(games).where(and(eq(games.id, gameId), eq(games.tournamentId, t.id)));
  if (!g || g.kind !== "game") return { error: "badGame" };
  // Older rounds can still be corrected; standings are recomputed from scratch on every view.
  await applyResult(t, g, result);
  revalidateEvent(t.id, t.slug);
  return { ok: true };
}

export async function setWithdrawn(tournamentId: string, playerId: string, withdrawn: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  await db
    .update(players)
    .set({ status: withdrawn ? "withdrawn" : "active" })
    .where(and(eq(players.id, playerId), eq(players.tournamentId, t.id)));
  revalidateEvent(t.id, t.slug);
  return { ok: true };
}
