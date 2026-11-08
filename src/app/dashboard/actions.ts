"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
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
  await getOwnedTournament(id, user.id);
  const parsed = tournamentFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await db.update(tournaments).set(parsed.data).where(and(eq(tournaments.id, id), eq(tournaments.ownerId, user.id)));
  revalidatePath(`/dashboard/t/${id}`, "layout");
  return { ok: true };
}

export async function addPlayer(tournamentId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
  const parsed = playerFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await db.insert(players).values({ ...parsed.data, tournamentId });
  revalidatePath(`/dashboard/t/${tournamentId}`);
  return { ok: true };
}

export async function removePlayer(tournamentId: string, playerId: string) {
  const user = await requireUser();
  await getOwnedTournament(tournamentId, user.id);
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
  const valid = rows.flatMap((r) => (r.player ? [{ ...r.player, tournamentId }] : []));
  if (valid.length) await db.insert(players).values(valid);
  revalidatePath(`/dashboard/t/${tournamentId}`);
  redirect(`/dashboard/t/${tournamentId}?imported=${valid.length}`);
}
