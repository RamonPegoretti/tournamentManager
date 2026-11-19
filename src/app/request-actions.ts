"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { games, resultRequests } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { RESULTS, type GameResult } from "@/lib/chess-types";
import { applyResult } from "@/lib/results";
import { getOwnedTournament, getTournamentBySlug } from "@/lib/tournaments";

export type RequestState = { error?: string; ok?: boolean } | undefined;

/** A signed-in player asks the organizer to correct a game result. */
export async function submitRequest(slug: string, gameId: string, _: RequestState, form: FormData): Promise<RequestState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/t/${slug}/report/${gameId}`)}`);
  const tour = await getTournamentBySlug(slug);
  const [g] = await db.select().from(games).where(and(eq(games.id, gameId), eq(games.tournamentId, tour.id)));
  if (!g || g.kind !== "game") return { error: "badGame" };
  const proposed = String(form.get("result") ?? "") as GameResult;
  if (!RESULTS.includes(proposed)) return { error: "chooseResult" };
  if (proposed === g.result) return { error: "sameResult" };
  if (tour.format === "knockout" && proposed === "draw") return { error: "knockoutDraw" };
  const message = String(form.get("message") ?? "").trim().slice(0, 1000) || null;
  const [open] = await db
    .select({ id: resultRequests.id })
    .from(resultRequests)
    .where(and(eq(resultRequests.gameId, g.id), eq(resultRequests.userId, user.id), eq(resultRequests.status, "pending")));
  if (open) {
    await db.update(resultRequests).set({ proposedResult: proposed, message, currentResult: g.result }).where(eq(resultRequests.id, open.id));
  } else {
    await db.insert(resultRequests).values({
      tournamentId: tour.id,
      gameId: g.id,
      userId: user.id,
      currentResult: g.result,
      proposedResult: proposed,
      message,
    });
  }
  revalidatePath(`/dashboard/t/${tour.id}`, "layout");
  revalidatePath("/requests");
  return { ok: true };
}

async function resolve(tournamentId: string, requestId: string, approve: boolean, response: string | null) {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const [r] = await db
    .select()
    .from(resultRequests)
    .where(and(eq(resultRequests.id, requestId), eq(resultRequests.tournamentId, t.id), eq(resultRequests.status, "pending")));
  if (!r) return;
  if (approve) {
    const [g] = await db.select().from(games).where(eq(games.id, r.gameId));
    if (g) await applyResult(t, g, r.proposedResult);
  }
  await db
    .update(resultRequests)
    .set({ status: approve ? "approved" : "denied", response, resolvedAt: new Date() })
    .where(eq(resultRequests.id, r.id));
  revalidatePath(`/dashboard/t/${t.id}`, "layout");
  revalidatePath(`/t/${t.slug}`, "layout");
  revalidatePath("/requests");
}

export async function approveRequest(tournamentId: string, requestId: string) {
  await resolve(tournamentId, requestId, true, null);
}

export async function denyRequest(tournamentId: string, requestId: string, form: FormData) {
  const response = String(form.get("response") ?? "").trim().slice(0, 1000) || null;
  await resolve(tournamentId, requestId, false, response);
}
