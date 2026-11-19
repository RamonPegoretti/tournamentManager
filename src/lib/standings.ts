import { gamePoints, wasPlayed, type GameLite, type PlayerLite } from "./chess-types";
import type { TiebreakCode } from "./tiebreaks";

export type RoundEntry = {
  round: number;
  opponentId: string | null;
  color: "w" | "b" | null;
  points: number;
  played: boolean; // played over the board
};

export type StandingRow = {
  rank: number;
  player: PlayerLite;
  points: number;
  tiebreaks: Record<string, number>;
  rounds: RoundEntry[];
};

/**
 * Standings after the rounds in `games` (only rounds where every result is in are counted
 * unless `includeIncomplete`). Tiebreaks follow FIDE C.07: for an opponent's score, their
 * unplayed rounds count as draws; each of the player's own unplayed rounds counts as a game
 * against a virtual opponent with the player's own score.
 */
export function computeStandings(players: PlayerLite[], games: GameLite[], tiebreaks: TiebreakCode[], roundsPlayed: number): StandingRow[] {
  const counted = games.filter((g) => g.round <= roundsPlayed);
  const entries = new Map<string, RoundEntry[]>(players.map((p) => [p.id, []]));

  for (const g of counted) {
    const [pw, pb] = gamePoints(g.kind, g.result);
    const played = wasPlayed(g.kind, g.result);
    entries.get(g.whiteId)?.push({ round: g.round, opponentId: g.blackId, color: g.blackId ? "w" : null, points: pw, played });
    if (g.blackId) entries.get(g.blackId)?.push({ round: g.round, opponentId: g.whiteId, color: "b", points: pb, played });
  }
  // Rounds a player wasn't in at all (late entry, withdrawn) count as unplayed zero.
  for (const [id, list] of entries) {
    for (let r = 1; r <= roundsPlayed; r++) {
      if (!list.some((e) => e.round === r)) list.push({ round: r, opponentId: null, color: null, points: 0, played: false });
    }
    list.sort((a, b) => a.round - b.round);
    entries.set(id, list);
  }

  const points = new Map<string, number>();
  for (const [id, list] of entries) points.set(id, list.reduce((s, e) => s + e.points, 0));

  // Opponent score for tiebreak purposes: unplayed rounds count as draws.
  const adjusted = new Map<string, number>();
  for (const [id, list] of entries) {
    adjusted.set(id, list.reduce((s, e) => s + (e.played ? e.points : 0.5), 0));
  }
  const ratingOf = new Map(players.map((p) => [p.id, p.rating]));

  /** One value per round: the opponent's adjusted score, or own score for a virtual opponent. */
  function opponentValues(id: string): { value: number; points: number; played: boolean }[] {
    const own = points.get(id)!;
    return entries.get(id)!.map((e) =>
      e.played && e.opponentId ? { value: adjusted.get(e.opponentId)!, points: e.points, played: true } : { value: own, points: e.points, played: false },
    );
  }

  function compute(code: TiebreakCode, id: string): number {
    const list = entries.get(id)!;
    const vals = opponentValues(id);
    switch (code) {
      case "BH":
        return sum(vals.map((v) => v.value));
      case "BH-C1": {
        if (vals.length <= 1) return 0;
        return sum(vals.map((v) => v.value)) - Math.min(...vals.map((v) => v.value));
      }
      case "BH-M1": {
        if (vals.length <= 2) return 0;
        const sorted = vals.map((v) => v.value).sort((a, b) => a - b);
        return sum(sorted.slice(1, -1));
      }
      case "SB":
        return sum(vals.map((v) => v.value * v.points));
      case "WIN":
        return list.filter((e) => e.points === 1).length;
      case "BPG":
        return list.filter((e) => e.played && e.color === "b").length;
      case "ARO": {
        const rated = list.filter((e) => e.played && e.opponentId && ratingOf.get(e.opponentId) != null);
        if (!rated.length) return 0;
        return Math.round(sum(rated.map((e) => ratingOf.get(e.opponentId!)!)) / rated.length);
      }
      case "PS": {
        let acc = 0;
        return sum(list.map((e) => (acc += e.points)));
      }
      case "KS": {
        const half = roundsPlayed / 2;
        return sum(list.filter((e) => e.played && e.opponentId && points.get(e.opponentId)! >= half).map((e) => e.points));
      }
      case "DE":
        return 0; // resolved per tie group below
    }
  }

  const rows: StandingRow[] = players.map((p) => ({
    rank: 0,
    player: p,
    points: points.get(p.id)!,
    tiebreaks: Object.fromEntries(tiebreaks.map((c) => [c, compute(c, p.id)])),
    rounds: entries.get(p.id)!,
  }));

  // Direct encounter: within each group tied on points and all earlier tiebreaks,
  // points scored against the other members, if every member met every other.
  const deIndex = tiebreaks.indexOf("DE");
  if (deIndex >= 0) {
    const before = tiebreaks.slice(0, deIndex);
    const groups = new Map<string, StandingRow[]>();
    for (const r of rows) {
      const key = [r.points, ...before.map((c) => r.tiebreaks[c])].join("|");
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const ids = new Set(group.map((r) => r.player.id));
      const allMet = group.every((r) => [...ids].every((o) => o === r.player.id || r.rounds.some((e) => e.played && e.opponentId === o)));
      if (!allMet) continue;
      for (const r of group) r.tiebreaks.DE = sum(r.rounds.filter((e) => e.played && e.opponentId && ids.has(e.opponentId)).map((e) => e.points));
    }
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    for (const c of tiebreaks) {
      const d = b.tiebreaks[c] - a.tiebreaks[c];
      if (d !== 0) return d;
    }
    return (a.player.startRank ?? 9999) - (b.player.startRank ?? 9999);
  });

  // Shared rank when points and all tiebreaks are equal.
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    const same = prev && prev.points === r.points && tiebreaks.every((c) => prev.tiebreaks[c] === r.tiebreaks[c]);
    r.rank = same ? prev.rank : i + 1;
  });
  return rows;
}

function sum(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0);
}

export function formatTiebreak(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}
