"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { games, players, tournaments } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { fideColumns } from "@/lib/fide-lookup";
import { getTournamentBySlug } from "@/lib/tournaments";
import { baseUrl, newToken } from "@/lib/url";
import { fieldErrors, registrationFromForm } from "@/lib/validation";

export type RegisterState = { errors?: Record<string, string>; ok?: boolean; link?: string; fideCheck?: string | null } | undefined;

/** Public self-signup. Entries wait for the organizer to approve the list. */
export async function selfRegister(slug: string, _: RegisterState, form: FormData): Promise<RegisterState> {
  // Bots fill every field, people never see this one.
  if (String(form.get("website") ?? "")) return { ok: true };
  const tour = await getTournamentBySlug(slug);
  if (!tour.registrationOpen) return { errors: { form: "closed" } };
  const parsed = registrationFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { fields: v, declaredRating } = parsed.data;

  const dup = await db
    .select({ id: players.id })
    .from(players)
    .where(
      and(
        eq(players.tournamentId, tour.id),
        or(sql`lower(${players.email}) = ${v.email.toLowerCase()}`, v.fideId ? eq(players.fideId, v.fideId) : sql`false`),
      ),
    )
    .limit(1);
  if (dup.length) return { errors: { form: "alreadyRegistered" } };

  const fide = await fideColumns(v.fideId);
  const token = newToken();
  await db.insert(players).values({
    ...v,
    ...fide,
    tournamentId: tour.id,
    // When FIDE couldn't be reached the declared rating is used, and the entry stays flagged.
    rating: fide.fideCheck === "ok" ? fide.fideRating : fide.fideCheck === "unverified" ? declaredRating : null,
    source: "self",
    approved: false,
    fixToken: token,
  });
  const link = `${await baseUrl()}/r/${token}`;
  const t = await getTranslations("register");
  await sendEmail(v.email, t("emailSubject", { name: tour.name }), t("emailBody", { name: v.firstName, tournament: tour.name, link }));
  revalidatePath(`/dashboard/t/${tour.id}`);
  revalidatePath(`/t/${slug}`);
  return { ok: true, link, fideCheck: fide.fideCheck };
}

export async function loadRegistration(token: string) {
  if (!/^[\w-]{10,64}$/.test(token)) return null;
  const [row] = await db
    .select({ player: players, tournament: tournaments })
    .from(players)
    .innerJoin(tournaments, eq(players.tournamentId, tournaments.id))
    .where(eq(players.fixToken, token));
  if (!row) return null;
  const [played] = await db
    .select({ id: games.id })
    .from(games)
    .where(or(eq(games.whiteId, row.player.id), eq(games.blackId, row.player.id)))
    .limit(1);
  // Once the player is paired, the organizer has to make changes.
  return { ...row, editable: !played && row.tournament.status !== "finished" };
}

/** The player fixes their own registration from the link in the warning email. */
export async function updateRegistration(token: string, _: RegisterState, form: FormData): Promise<RegisterState> {
  const reg = await loadRegistration(token);
  if (!reg) return { errors: { form: "notFound" } };
  if (!reg.editable) return { errors: { form: "locked" } };
  const parsed = registrationFromForm(form);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { fields: v, declaredRating } = parsed.data;
  const fide = v.fideId === reg.player.fideId && reg.player.fideCheck === "ok"
    ? { fideCheck: reg.player.fideCheck, fideName: reg.player.fideName, fideRating: reg.player.fideRating }
    : await fideColumns(v.fideId);
  await db
    .update(players)
    .set({ ...v, ...fide, rating: fide.fideCheck === "ok" ? fide.fideRating : fide.fideCheck === "unverified" ? declaredRating : null, approved: false, warningNote: null, fixedAt: new Date() })
    .where(eq(players.id, reg.player.id));
  revalidatePath(`/dashboard/t/${reg.tournament.id}`);
  revalidatePath(`/t/${reg.tournament.slug}`);
  revalidatePath(`/r/${token}`);
  return { ok: true, fideCheck: fide.fideCheck };
}
