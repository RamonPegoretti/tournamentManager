import "server-only";
import type { Tournament } from "@/db/schema";
import { resultLabel } from "./chess-types";
import { toCsv } from "./csv";
import { displayName } from "./names";
import { computeStandings } from "./standings";
import { teamStandings } from "./team";
import type { TiebreakCode } from "./tiebreaks";
import { buildTrf } from "./trf";
import type { loadEventData } from "./tournaments";

type EventData = Awaited<ReturnType<typeof loadEventData>>;

const teamNames = (data: EventData) => new Map(data.teams.map((t) => [t.id, t.name]));

export function playersCsv(data: EventData) {
  const team = teamNames(data);
  const sorted = [...data.players].sort((a, b) => (a.startRank ?? 9999) - (b.startRank ?? 9999) || (b.rating ?? -1) - (a.rating ?? -1));
  return toCsv([
    ["No", "Last name", "First name", "FIDE ID", "Rating", "Federation", "Birth year", "Club", "Team", "Email", "Status"],
    ...sorted.map((p) => [p.startRank, p.lastName, p.firstName, p.fideId, p.rating, p.federation, p.birthYear, p.club, p.teamId ? team.get(p.teamId) : null, p.email, p.status]),
  ]);
}

export function pairingsCsv(data: EventData) {
  const byId = new Map(data.players.map((p) => [p.id, p]));
  const team = teamNames(data);
  const matchOf = new Map(data.matches.map((m) => [m.id, m]));
  return toCsv([
    ["Round", "Match", "Board", "White", "White rating", "Black", "Black rating", "Result"],
    ...data.games.map((g) => {
      const w = byId.get(g.whiteId)!;
      const b = g.blackId ? byId.get(g.blackId) : null;
      const m = g.matchId ? matchOf.get(g.matchId) : null;
      const match = m ? `${team.get(m.whiteTeamId)} - ${m.blackTeamId ? team.get(m.blackTeamId) : "bye"}` : null;
      return [g.round, match, g.board, displayName(w), w.rating, b ? displayName(b) : "bye", b?.rating, resultLabel(g.kind, g.result).replaceAll("½", "1/2").replaceAll("–", "-").replaceAll("−", "-")];
    }),
  ]);
}

export function standingsCsv(t: Tournament, data: EventData) {
  if (t.format === "team") {
    const teamOf = new Map(data.players.map((p) => [p.id, p.teamId]));
    const rows = teamStandings(data.teams, data.matches, data.games, (id) => teamOf.get(id) ?? null, t.boardsPerTeam, data.roundsDone);
    return toCsv([["Rank", "Team", "Match points", "Game points", "Buchholz"], ...rows.map((r) => [r.rank, r.team.name, r.mp, r.gp, r.bh])]);
  }
  const tbs = t.tiebreaks as TiebreakCode[];
  const rows = computeStandings(data.playerLites, data.gameLites, tbs, data.roundsDone);
  return toCsv([
    ["Rank", "Name", "Rating", "Federation", "Points", ...tbs],
    ...rows.map((r) => [r.rank, displayName(r.player), r.player.rating, r.player.federation, r.points, ...tbs.map((c) => r.tiebreaks[c])]),
  ]);
}

const trfDate = (d: string | null) => (d ? d.replace(/-/g, "/") : "");

/** FIDE TRF-16 tournament report of all finished rounds. */
export function trfReport(t: Tournament, data: EventData) {
  const ranked = computeStandings(data.playerLites, data.gameLites, (t.tiebreaks as TiebreakCode[]) ?? [], data.roundsDone);
  const rankOf = new Map(ranked.map((r, i) => [r.player.id, i + 1]));
  const lites = data.playerLites.filter((p) => p.startRank !== null);
  const roundDates = data.rounds.filter((r) => r.number <= data.roundsDone).map((r) => r.createdAt.toISOString().slice(2, 10).replace(/-/g, "/"));
  const typeLabel = { swiss: "Swiss Dutch", round_robin: "Round robin", knockout: "Knockout", team: "Team" }[t.format];
  const header = [
    `022 ${t.location ?? ""}`,
    `042 ${trfDate(t.startDate)}`,
    `052 ${trfDate(t.endDate ?? t.startDate)}`,
    `062 ${lites.length}`,
    `072 ${lites.filter((p) => p.rating !== null).length}`,
    `092 ${typeLabel}`,
    `122 ${t.timeControl ?? ""}`,
    `132 ${" ".repeat(85)}${roundDates.map((d) => `  ${d}`).join("")}`,
  ].map((l) => l.trimEnd());
  return buildTrf({
    name: t.name,
    totalRounds: t.rounds ?? data.roundsDone,
    nextRound: data.roundsDone + 1,
    players: lites,
    games: data.gameLites.filter((g) => g.round <= data.roundsDone),
    preByes: [],
    header,
    rankOf,
  });
}
