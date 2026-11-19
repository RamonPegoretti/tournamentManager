"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { games, players, rounds, teamMatches, teams, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { RESULTS, type GameResult } from "@/lib/chess-types";
import { PairingError } from "@/lib/pairing";
import { PlanError, planRound } from "@/lib/pair-round";
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
  const data = await loadEventData(t.id);
  const next = data.currentRound + 1;
  if (t.rounds && next > t.rounds) return { error: "allRoundsPaired" };
  if (data.currentRound > 0 && data.rounds[data.rounds.length - 1].status !== "finished") return { error: "resultsMissing" };
  const active = data.players.filter((p) => p.status === "active");
  if (active.length < 2) return { error: "notEnoughPlayers" };
  if (data.currentRound === 0 && active.some((p) => !p.approved)) return { error: "notApproved" };

  let plan;
  try {
    plan = await planRound(t, data);
  } catch (e) {
    if (e instanceof PairingError) return { error: "engine", detail: e.message };
    if (e instanceof PlanError) return { error: e.message };
    throw e;
  }

  await db.transaction(async (tx) => {
    for (const [id, r] of plan.playerRanks ?? []) await tx.update(players).set({ startRank: r }).where(eq(players.id, id));
    for (const [id, b] of plan.teamBoards ?? []) await tx.update(players).set({ teamBoard: b }).where(eq(players.id, id));
    for (const [id, r] of plan.teamRanks ?? []) await tx.update(teams).set({ startRank: r }).where(eq(teams.id, id));
    const [round] = await tx.insert(rounds).values({ tournamentId: t.id, number: next }).returning();
    const matchIds = new Map<number, string>();
    if (plan.matches?.length) {
      const inserted = await tx
        .insert(teamMatches)
        .values(plan.matches.map((m) => ({ ...m, tournamentId: t.id, roundId: round.id, round: next })))
        .returning({ id: teamMatches.id, board: teamMatches.board });
      for (const m of inserted) matchIds.set(m.board, m.id);
    }
    if (plan.games.length) {
      await tx.insert(games).values(
        plan.games.map((p) => ({
          tournamentId: t.id,
          roundId: round.id,
          round: next,
          board: p.board,
          kind: p.kind,
          whiteId: p.whiteId,
          blackId: p.blackId,
          matchId: p.match ? matchIds.get(p.match) : null,
        })),
      );
    }
    // A round made only of byes is complete straight away.
    if (plan.games.every((p) => p.kind !== "game")) await tx.update(rounds).set({ status: "finished" }).where(eq(rounds.id, round.id));
    await tx
      .update(tournaments)
      .set({ status: "running", registrationOpen: false, ...(plan.totalRounds ? { rounds: plan.totalRounds } : {}) })
      .where(eq(tournaments.id, t.id));
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
  const autoRounds = t.format === "round_robin" || t.format === "knockout" || (t.format === "team" && t.teamSystem === "round_robin");
  if (last.number === 1) await db.update(tournaments).set({ status: "draft", ...(autoRounds ? { rounds: null } : {}) }).where(eq(tournaments.id, t.id));
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
  if (t.format === "knockout" && result === "draw") return { error: "knockoutDraw" };
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
