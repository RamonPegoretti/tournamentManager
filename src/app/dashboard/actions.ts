"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { games, players, rounds, teams, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fideColumns } from "@/lib/fide-lookup";
import { parsePlayersFile } from "@/lib/players-import";
import { getOwnedTournament, slugify } from "@/lib/tournaments";
import { fieldErrors, playerFromForm, tournamentFromForm } from "@/lib/validation";

export type FormState = { errors?: Record<string, string>; ok?: boolean; count?: number } | undefined;

export async function createTournament(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = tournamentFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const [t] = await db
    .insert(tournaments)
    .values({ ...parsed.data, ownerId: user.id, slug: slugify(parsed.data.name) })
    .returning({ id: tournaments.id });
  redirect(`/dashboard/t/${t.id}`);
}

export async function updateTournament(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = await getOwnedTournament(id, user.id);
  const parsed = tournamentFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const paired = await db.select({ n: rounds.number }).from(rounds).where(eq(rounds.tournamentId, id));
  // Round robin and knockout set their own number of rounds when round 1 is paired.
  if (paired.length && parsed.data.rounds === null) parsed.data.rounds = current.rounds;
  if (paired.length) {
    if (parsed.data.format !== current.format) return { errors: { format: "formatLocked" } };
    const max = Math.max(...paired.map((r) => r.n));
    if (parsed.data.rounds !== null && parsed.data.rounds < max) return { errors: { rounds: "roundsBelowPaired" } };
    // Adding rounds to a finished event reopens it.
    if (current.status === "finished" && parsed.data.rounds !== null && parsed.data.rounds > max) {
      await db.update(tournaments).set({ status: "running" }).where(eq(tournaments.id, id));
    }
  }
  await db.update(tournaments).set(parsed.data).where(and(eq(tournaments.id, id), eq(tournaments.ownerId, user.id)));
  revalidatePath(`/dashboard/t/${id}`, "layout");
  revalidatePath(`/t/${current.slug}`, "layout");
  return { ok: true };
}

/** Team ids by name, creating the teams that don't exist yet. */
async function teamIds(tournamentId: string, names: (string | null)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(names.filter((n): n is string => !!n))];
  if (!wanted.length) return new Map();
  await db.insert(teams).values(wanted.map((name) => ({ tournamentId, name }))).onConflictDoNothing();
  const rows = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.tournamentId, tournamentId));
  return new Map(rows.map((r) => [r.name, r.id]));
}

export async function addPlayer(tournamentId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
  const parsed = playerFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const fide = await fideColumns(parsed.data.fideId);
  // An empty rating with a known FIDE ID takes the FIDE rating.
  const rating = parsed.data.rating ?? (fide.fideCheck === "ok" ? fide.fideRating : null);
  const { team, ...fields } = parsed.data;
  const teamId = team ? (await teamIds(tournamentId, [team])).get(team)! : null;
  await db.insert(players).values({ ...fields, ...fide, rating, teamId, tournamentId });
  revalidatePath(`/dashboard/t/${tournamentId}`);
  return { ok: true };
}

export async function updatePlayer(tournamentId: string, playerId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
  const parsed = playerFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const [current] = await db.select().from(players).where(and(eq(players.id, playerId), eq(players.tournamentId, tournamentId)));
  if (!current) return { errors: { form: "notFound" } };
  const fide = parsed.data.fideId === current.fideId ? {} : await fideColumns(parsed.data.fideId);
  const { team, ...fields } = parsed.data;
  const teamId = team ? (await teamIds(tournamentId, [team])).get(team)! : null;
  await db.update(players).set({ ...fields, ...fide, teamId }).where(eq(players.id, playerId));
  revalidatePath(`/dashboard/t/${tournamentId}`, "layout");
  redirect(`/dashboard/t/${tournamentId}`);
}

export async function removePlayer(tournamentId: string, playerId: string) {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
  // Players who already have pairings are withdrawn instead, so past rounds stay intact.
  const [used] = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.tournamentId, tournamentId), or(eq(games.whiteId, playerId), eq(games.blackId, playerId))))
    .limit(1);
  if (used) return;
  await db.delete(players).where(and(eq(players.id, playerId), eq(players.tournamentId, tournamentId)));
  revalidatePath(`/dashboard/t/${tournamentId}`);
}

export async function importPlayers(tournamentId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
  const text = String(form.get("text") ?? "");
  // Parse again on the server: never trust the client preview.
  const { rows, missingColumns } = parsePlayersFile(text);
  if (missingColumns.length) return { errors: { form: "missingName" } };
  const ok = rows.flatMap((r) => (r.player ? [r.player] : []));
  const ids = await teamIds(tournamentId, ok.map((p) => p.team));
  const valid = ok.map(({ team, ...p }) => ({ ...p, teamId: team ? ids.get(team)! : null, tournamentId }));
  if (valid.length) await db.insert(players).values(valid);
  revalidatePath(`/dashboard/t/${tournamentId}`);
  redirect(`/dashboard/t/${tournamentId}?imported=${valid.length}`);
}
