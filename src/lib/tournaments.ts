import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { players, tournaments } from "@/db/schema";

export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "tournament"}-${suffix}`;
}

export async function listTournaments(ownerId: string) {
  return db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      format: tournaments.format,
      status: tournaments.status,
      rounds: tournaments.rounds,
      startDate: tournaments.startDate,
      location: tournaments.location,
      playerCount: count(players.id),
    })
    .from(tournaments)
    .leftJoin(players, eq(players.tournamentId, tournaments.id))
    .where(eq(tournaments.ownerId, ownerId))
    .groupBy(tournaments.id)
    .orderBy(desc(tournaments.createdAt));
}

/** Load a tournament the user owns, or 404. */
export async function getOwnedTournament(id: string, ownerId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [t] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.id, id), eq(tournaments.ownerId, ownerId)));
  if (!t) notFound();
  return t;
}

export async function listPlayers(tournamentId: string) {
  return db
    .select()
    .from(players)
    .where(eq(players.tournamentId, tournamentId))
    .orderBy(sql`${players.rating} desc nulls last`, asc(players.lastName), asc(players.firstName));
}
