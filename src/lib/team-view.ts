import { gamePoints } from "./chess-types";
import type { loadEventData } from "./tournaments";

type EventData = Awaited<ReturnType<typeof loadEventData>>;

/** Matches of one round with team names and the score so far (finished boards only). */
export function roundMatches(data: EventData, round: number, boards: number) {
  const teamName = new Map(data.teams.map((t) => [t.id, t.name]));
  const teamOf = new Map(data.players.map((p) => [p.id, p.teamId]));
  return data.matches
    .filter((m) => m.round === round)
    .map((m) => {
      const games = data.games.filter((g) => g.matchId === m.id).sort((a, b) => a.board - b.board);
      let home = m.blackTeamId ? 0 : boards / 2;
      let away = 0;
      for (const g of games) {
        const [w, b] = gamePoints(g.kind, g.result);
        if (teamOf.get(g.whiteId) === m.whiteTeamId) home += w;
        else away += w;
        if (g.blackId) {
          if (teamOf.get(g.blackId) === m.whiteTeamId) home += b;
          else away += b;
        }
      }
      return {
        match: m,
        home: teamName.get(m.whiteTeamId) ?? "?",
        away: m.blackTeamId ? (teamName.get(m.blackTeamId) ?? "?") : null,
        score: [home, away] as [number, number],
        games,
        done: games.every((g) => g.kind !== "game" || g.result !== null),
      };
    });
}
