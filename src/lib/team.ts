import { gamePoints, type GameKind, type GameResult } from "./chess-types";

export type TeamLite = { id: string; name: string; startRank: number | null };
export type MatchLite = { id: string; round: number; board: number; whiteTeamId: string; blackTeamId: string | null };
export type MatchGame = { matchId: string | null; kind: GameKind; result: GameResult | null; whiteId: string; blackId: string | null };

/** Game points of each team in one match: [white team, black team]. Null while a game is unfinished. */
export function matchScore(
  m: MatchLite,
  games: MatchGame[],
  teamOf: (playerId: string) => string | null,
  boards: number,
): [number, number] | null {
  if (!m.blackTeamId) return [boards / 2, 0]; // team bye: a match win and half the boards
  let a = 0;
  let b = 0;
  for (const g of games) {
    if (g.matchId !== m.id) continue;
    if (g.kind === "game" && g.result === null) return null;
    const [w, bl] = gamePoints(g.kind, g.result);
    if (teamOf(g.whiteId) === m.whiteTeamId) a += w;
    else b += w;
    if (g.blackId) {
      if (teamOf(g.blackId) === m.whiteTeamId) a += bl;
      else b += bl;
    }
  }
  return [a, b];
}

export const matchPoints = (mine: number, theirs: number) => (mine > theirs ? 2 : mine === theirs ? 1 : 0);

export type TeamRow = { rank: number; team: TeamLite; mp: number; gp: number; bh: number; played: number };

/** Team standings: match points, then game points, then Buchholz of match points. */
export function teamStandings(
  teams: TeamLite[],
  matches: MatchLite[],
  games: MatchGame[],
  teamOf: (playerId: string) => string | null,
  boards: number,
  roundsDone: number,
): TeamRow[] {
  const mp = new Map(teams.map((t) => [t.id, 0]));
  const gp = new Map(teams.map((t) => [t.id, 0]));
  const opps = new Map<string, string[]>(teams.map((t) => [t.id, []]));
  const played = new Map(teams.map((t) => [t.id, 0]));
  for (const m of matches) {
    if (m.round > roundsDone) continue;
    const s = matchScore(m, games, teamOf, boards);
    if (!s) continue;
    const add = (id: string, mine: number, theirs: number) => {
      mp.set(id, (mp.get(id) ?? 0) + matchPoints(mine, theirs));
      gp.set(id, (gp.get(id) ?? 0) + mine);
      played.set(id, (played.get(id) ?? 0) + 1);
    };
    add(m.whiteTeamId, s[0], s[1]);
    if (m.blackTeamId) {
      add(m.blackTeamId, s[1], s[0]);
      opps.get(m.whiteTeamId)?.push(m.blackTeamId);
      opps.get(m.blackTeamId)?.push(m.whiteTeamId);
    }
  }
  const rows = teams.map((team) => ({
    team,
    mp: mp.get(team.id)!,
    gp: gp.get(team.id)!,
    bh: opps.get(team.id)!.reduce((s, o) => s + (mp.get(o) ?? 0), 0),
    played: played.get(team.id)!,
    rank: 0,
  }));
  const key = (r: TeamRow) => [r.mp, r.gp, r.bh];
  rows.sort((x, y) => y.mp - x.mp || y.gp - x.gp || y.bh - x.bh || (x.team.startRank ?? 999) - (y.team.startRank ?? 999));
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && key(prev).every((v, j) => v === key(r)[j]) ? prev.rank : i + 1;
  });
  return rows;
}

/**
 * Board games of one match. Players are each team's line-up in board order.
 * The first-named team has White on odd boards. A missing player loses that board by forfeit
 * (stored as a bye for the player who is there).
 */
export function matchBoards(home: string[], away: string[], boards: number) {
  const out: { kind: "game" | "pab"; whiteId: string; blackId: string | null }[] = [];
  for (let i = 0; i < boards; i++) {
    const h = home[i];
    const a = away[i];
    if (h && a) out.push(i % 2 === 0 ? { kind: "game", whiteId: h, blackId: a } : { kind: "game", whiteId: a, blackId: h });
    else if (h || a) out.push({ kind: "pab", whiteId: (h ?? a)!, blackId: null });
  }
  return out;
}
