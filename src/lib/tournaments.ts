import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { games, players, rounds, tournaments, type Game, type Player } from "@/db/schema";
import type { GameLite, PlayerLite } from "./chess-types";

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

/** Everything needed to show pairings and standings. */
export async function loadEventData(tournamentId: string) {
  const [ps, gs, rs] = await Promise.all([
    db.select().from(players).where(eq(players.tournamentId, tournamentId)),
    db.select().from(games).where(eq(games.tournamentId, tournamentId)).orderBy(asc(games.round), asc(games.board)),
    db.select().from(rounds).where(eq(rounds.tournamentId, tournamentId)).orderBy(asc(rounds.number)),
  ]);
  const finishedRounds = rs.filter((r) => r.status === "finished").map((r) => r.number);
  // Standings count rounds up to the last one in an unbroken run of finished rounds.
  let roundsDone = 0;
  while (finishedRounds.includes(roundsDone + 1)) roundsDone++;
  return {
    players: ps,
    games: gs,
    rounds: rs,
    roundsDone,
    currentRound: rs.length ? rs[rs.length - 1].number : 0,
    playerLites: ps.map(toPlayerLite),
    gameLites: gs.map(toGameLite),
  };
}

export function toPlayerLite(p: Player): PlayerLite {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    rating: p.rating,
    fideId: p.fideId,
    federation: p.federation,
    birthYear: p.birthYear,
    startRank: p.startRank,
    status: p.status,
  };
}

export function toGameLite(g: Game): GameLite {
  return { round: g.round, board: g.board, kind: g.kind, whiteId: g.whiteId, blackId: g.blackId, result: g.result };
}

export async function getTournamentBySlug(slug: string) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.slug, slug));
  if (!t) notFound();
  return t;
}
