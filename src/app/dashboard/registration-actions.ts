"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { players, rounds, tournaments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { lookupMany } from "@/lib/fide-lookup";
import { getOwnedTournament } from "@/lib/tournaments";
import { baseUrl, newToken } from "@/lib/url";

function revalidate(id: string, slug: string) {
  revalidatePath(`/dashboard/t/${id}`, "layout");
  revalidatePath(`/t/${slug}`, "layout");
}

export async function setRegistrationOpen(tournamentId: string, open: boolean) {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const [started] = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.tournamentId, t.id)).limit(1);
  const status = started ? t.status : open ? "registration" : "draft";
  await db.update(tournaments).set({ registrationOpen: open && !started, status }).where(eq(tournaments.id, t.id));
  revalidate(t.id, t.slug);
}

/** The organizer approves the whole list at once. */
export async function approvePlayers(tournamentId: string) {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  await db.update(players).set({ approved: true }).where(and(eq(players.tournamentId, t.id), eq(players.approved, false)));
  revalidate(t.id, t.slug);
}

/** Look up every FIDE ID in the list again. */
export async function recheckFide(tournamentId: string) {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const list = await db
    .select({ id: players.id, fideId: players.fideId })
    .from(players)
    .where(and(eq(players.tournamentId, t.id), isNotNull(players.fideId)));
  const found = await lookupMany(list.map((p) => p.fideId!));
  await db.transaction(async (tx) => {
    for (const p of list) {
      const r = found.get(p.fideId!)!;
      const cols =
        r.status === "ok"
          ? { fideCheck: "ok", fideName: r.profile.name, fideRating: r.profile.rating }
          : { fideCheck: r.status, fideName: null, fideRating: null };
      await tx.update(players).set(cols).where(eq(players.id, p.id));
    }
  });
  revalidate(t.id, t.slug);
}

/** Copy the FIDE rating onto every player whose FIDE ID was found. */
export async function applyFideRatings(tournamentId: string) {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const list = await db
    .select({ id: players.id, fideRating: players.fideRating })
    .from(players)
    .where(and(eq(players.tournamentId, t.id), eq(players.fideCheck, "ok")));
  await db.transaction(async (tx) => {
    for (const p of list) await tx.update(players).set({ rating: p.fideRating }).where(eq(players.id, p.id));
  });
  revalidate(t.id, t.slug);
}

export type WarnState = { link?: string; emailed?: boolean; error?: string } | undefined;

/** Ask a player to fix their registration: makes a private link and emails it when possible. */
export async function warnPlayer(tournamentId: string, playerId: string, _: WarnState, form: FormData): Promise<WarnState> {
  const user = await requireUser();
  const t = await getOwnedTournament(tournamentId, user.id);
  const [p] = await db.select().from(players).where(and(eq(players.id, playerId), eq(players.tournamentId, t.id)));
  if (!p) return { error: "notFound" };
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  const token = p.fixToken ?? newToken();
  await db.update(players).set({ fixToken: token, warningNote: note, warnedAt: new Date() }).where(eq(players.id, p.id));
  const link = `${await baseUrl()}/r/${token}`;
  let emailed = false;
  if (p.email) {
    const tr = await getTranslations("warn");
    emailed = await sendEmail(
      p.email,
      tr("emailSubject", { tournament: t.name }),
      tr("emailBody", { name: p.firstName || p.lastName, tournament: t.name, note: note ?? "", link }),
    );
  }
  revalidate(t.id, t.slug);
  return { link, emailed };
}
