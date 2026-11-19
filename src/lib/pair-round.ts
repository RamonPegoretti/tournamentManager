import "server-only";
import type { Team, Tournament } from "@/db/schema";
import { bergerSchedule, roundRobinRounds } from "./berger";
import type { GameKind, GameLite, GameResult, PlayerLite } from "./chess-types";
import { firstRound, knockoutRounds, nextRound } from "./knockout";
import { pairDutch } from "./pairing";
import { matchBoards, matchScore } from "./team";
import type { loadEventData } from "./tournaments";

type EventData = Awaited<ReturnType<typeof loadEventData>>;
type Player = EventData["players"][number];

export type PlannedGame = { board: number; kind: GameKind; whiteId: string; blackId: string | null; match?: number };
export type PlannedMatch = { board: number; whiteTeamId: string; blackTeamId: string | null };
export type Plan = {
  games: PlannedGame[];
  matches?: PlannedMatch[];
  totalRounds?: number;
  playerRanks?: Map<string, number>;
  teamRanks?: Map<string, number>;
  teamBoards?: Map<string, number>;
};
export class PlanError extends Error {}

const byRating = (a: Player, b: Player) =>
  (b.rating ?? -1) - (a.rating ?? -1) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);

/** Pairing numbers: by rating before round 1; later entries are appended at the end. */
function startRanks(data: EventData): Map<string, number> {
  const order =
    data.currentRound === 0
      ? [...data.players].sort(byRating)
      : [
          ...data.players.filter((p) => p.startRank !== null).sort((a, b) => a.startRank! - b.startRank!),
          ...data.players.filter((p) => p.startRank === null).sort(byRating),
        ];
  return new Map(order.map((p, i) => [p.id, i + 1]));
}

export async function planRound(t: Tournament, data: EventData): Promise<Plan> {
  const next = data.currentRound + 1;
  if (t.format === "team") return planTeamRound(t, data, next);

  const ranks = startRanks(data);
  const needsRanks = data.currentRound === 0 || data.players.some((p) => p.startRank === null);
  const idByRank = new Map([...ranks].map(([id, r]) => [r, id]));

  if (t.format === "swiss") {
    const lites: PlayerLite[] = data.playerLites.map((p) => ({ ...p, startRank: ranks.get(p.id)! }));
    const games = await pairDutch({ name: t.name, totalRounds: t.rounds ?? Math.max(next, 5), nextRound: next, players: lites, games: data.gameLites, preByes: [] });
    return { games, playerRanks: needsRanks ? ranks : undefined };
  }

  if (t.format === "round_robin") {
    if (data.currentRound > 0 && data.players.some((p) => p.startRank === null)) throw new PlanError("lateEntry");
    const n = data.currentRound === 0 ? data.players.length : data.players.filter((p) => p.startRank !== null).length;
    const schedule = bergerSchedule(n);
    if (next > schedule.length) throw new PlanError("allRoundsPaired");
    const games = schedule[next - 1].map(([w, b], i) => ({
      board: i + 1,
      kind: (b === null ? "zero_bye" : "game") as GameKind,
      whiteId: idByRank.get(w)!,
      blackId: b === null ? null : idByRank.get(b)!,
    }));
    // The bye goes last on the board list.
    games.sort((a, b) => Number(a.kind !== "game") - Number(b.kind !== "game"));
    games.forEach((g, i) => (g.board = i + 1));
    return { games, totalRounds: roundRobinRounds(n), playerRanks: data.currentRound === 0 ? ranks : undefined };
  }

  // Knockout. Board number = bracket slot, so empty slots leave gaps.
  if (data.currentRound === 0) {
    const active = data.players.filter((p) => p.status === "active").sort(byRating);
    const seeds = new Map(active.map((p, i) => [p.id, i + 1]));
    const idBySeed = new Map(active.map((p, i) => [i + 1, p.id]));
    const games = firstRound(active.length).map((p, i) => ({
      board: i + 1,
      kind: (p.black === null ? "pab" : "game") as GameKind,
      whiteId: idBySeed.get(p.white)!,
      blackId: p.black === null ? null : idBySeed.get(p.black)!,
    }));
    // Withdrawn players get no seed: they go to the end of the pairing numbers.
    const all = new Map(seeds);
    data.players.filter((p) => !seeds.has(p.id)).forEach((p, i) => all.set(p.id, active.length + i + 1));
    return { games, totalRounds: knockoutRounds(active.length), playerRanks: all };
  }
  const rankOf = new Map(data.players.map((p) => [p.id, p.startRank!]));
  const prevGames = data.games.filter((g) => g.round === data.currentRound);
  const size = 2 ** ((t.rounds ?? data.currentRound) - data.currentRound + 1);
  const prev = Array.from({ length: size }, (_, i) => {
    const g = prevGames.find((x) => x.board === i + 1);
    return g ? { white: rankOf.get(g.whiteId)!, black: g.blackId ? rankOf.get(g.blackId)! : null, result: g.result as GameResult | null } : null;
  });
  if (prevGames.some((g) => g.kind === "game" && g.result === "draw")) throw new PlanError("knockoutDraw");
  const pairs = nextRound(prev, next);
  if (!pairs) throw new PlanError("resultsMissing");
  const idOf = new Map(data.players.map((p) => [p.startRank!, p.id]));
  const games: PlannedGame[] = [];
  pairs.forEach((p, i) => {
    if (p) games.push({ board: i + 1, kind: p.black === null ? "pab" : "game", whiteId: idOf.get(p.white)!, blackId: p.black === null ? null : idOf.get(p.black)! });
  });
  return { games };
}

async function planTeamRound(t: Tournament, data: EventData, next: number): Promise<Plan> {
  const k = t.boardsPerTeam;
  const noTeam = data.players.filter((p) => !p.teamId && p.status === "active");
  if (noTeam.length) throw new PlanError("noTeam");
  const members = (teamId: string) => data.players.filter((p) => p.teamId === teamId);
  const playing = data.teams.filter((tm) => members(tm.id).length > 0);
  if (playing.length < 2) throw new PlanError("notEnoughTeams");

  // Before round 1: board order inside each team by rating, team seeds by average of the top boards.
  let teamRanks: Map<string, number> | undefined;
  let teamBoards: Map<string, number> | undefined;
  const boardOf = new Map(data.players.map((p) => [p.id, p.teamBoard]));
  const rankOfTeam = new Map(data.teams.map((tm) => [tm.id, tm.startRank]));
  if (data.currentRound === 0) {
    teamBoards = new Map();
    const strength = new Map<string, number>();
    for (const tm of playing) {
      const sorted = members(tm.id).sort((a, b) => (a.teamBoard ?? 999) - (b.teamBoard ?? 999) || byRating(a, b));
      sorted.forEach((p, i) => teamBoards!.set(p.id, i + 1));
      const top = sorted.slice(0, k).map((p) => p.rating ?? 0);
      strength.set(tm.id, top.reduce((s, r) => s + r, 0) / Math.max(top.length, 1));
    }
    const order = [...playing].sort((a, b) => strength.get(b.id)! - strength.get(a.id)! || a.name.localeCompare(b.name));
    teamRanks = new Map(order.map((tm, i) => [tm.id, i + 1]));
    for (const [id, b] of teamBoards) boardOf.set(id, b);
    for (const [id, r] of teamRanks) rankOfTeam.set(id, r);
  } else if (playing.some((tm) => tm.startRank === null)) {
    throw new PlanError("lateEntry");
  }
  const teamById = new Map<string, Team>(playing.map((tm) => [tm.id, tm]));
  const lineup = (teamId: string) =>
    members(teamId)
      .filter((p) => p.status === "active")
      .sort((a, b) => (boardOf.get(a.id) ?? 999) - (boardOf.get(b.id) ?? 999))
      .slice(0, k)
      .map((p) => p.id);

  let pairs: { white: string; black: string | null }[];
  let totalRounds: number | undefined;
  if (t.teamSystem === "round_robin") {
    const seeded = [...playing].sort((a, b) => rankOfTeam.get(a.id)! - rankOfTeam.get(b.id)!);
    const schedule = bergerSchedule(seeded.length);
    if (next > schedule.length) throw new PlanError("allRoundsPaired");
    totalRounds = roundRobinRounds(seeded.length);
    pairs = schedule[next - 1].map(([w, b]) => ({ white: seeded[w - 1].id, black: b === null ? null : seeded[b - 1].id }));
  } else {
    const teamOf = (pid: string) => data.players.find((p) => p.id === pid)?.teamId ?? null;
    const lites: PlayerLite[] = playing.map((tm) => ({
      id: tm.id,
      firstName: "",
      lastName: tm.name,
      rating: null,
      fideId: null,
      federation: null,
      birthYear: null,
      startRank: rankOfTeam.get(tm.id)!,
      status: "active",
    }));
    const history: GameLite[] = data.matches.map((m) => {
      if (!m.blackTeamId) return { round: m.round, board: m.board, kind: "pab", whiteId: m.whiteTeamId, blackId: null, result: null };
      const s = matchScore(m, data.games, teamOf, k)!;
      const result: GameResult = s[0] > s[1] ? "white" : s[0] < s[1] ? "black" : "draw";
      return { round: m.round, board: m.board, kind: "game", whiteId: m.whiteTeamId, blackId: m.blackTeamId, result };
    });
    const out = await pairDutch({ name: t.name, totalRounds: t.rounds ?? Math.max(next, 5), nextRound: next, players: lites, games: history, preByes: [] });
    pairs = out.map((p) => ({ white: p.whiteId, black: p.blackId }));
  }
  // Byes last.
  pairs.sort((a, b) => Number(a.black === null) - Number(b.black === null));
  const matches: PlannedMatch[] = pairs.map((p, i) => ({ board: i + 1, whiteTeamId: p.white, blackTeamId: p.black }));
  const games: PlannedGame[] = [];
  let board = 0;
  for (const m of matches) {
    if (!m.blackTeamId || !teamById.has(m.whiteTeamId)) continue;
    for (const g of matchBoards(lineup(m.whiteTeamId), lineup(m.blackTeamId), k)) games.push({ ...g, board: ++board, match: m.board });
  }
  return { games, matches, totalRounds, teamRanks, teamBoards };
}
