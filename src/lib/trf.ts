import { gamePoints, type GameLite, type PlayerLite } from "./chess-types";

/** Byes the organizer decided before pairing (player won't be paired this round). */
export type PreBye = { playerId: string; kind: "half_bye" | "zero_bye" };

const pad = (s: string | number, n: number, right = false) => {
  const str = String(s);
  return (right ? str.padEnd(n) : str.padStart(n)).slice(0, n);
};

function fmtPoints(p: number) {
  return p.toFixed(1).padStart(4);
}

/**
 * Builds a TRF-2016 / JaVaFo-AUM file for bbpPairings to pair `nextRound`.
 * Players must have startRank set (1..n, contiguous).
 */
export function buildTrf(opts: {
  name: string;
  totalRounds: number;
  nextRound: number;
  players: PlayerLite[];
  games: GameLite[];
  preByes: PreBye[];
  /** Report mode: extra header lines, final ranks instead of pairing numbers, no engine extensions. */
  header?: string[];
  rankOf?: Map<string, number>;
}): string {
  const { players, games, nextRound } = opts;
  const byId = new Map(players.map((p) => [p.id, p]));
  const lines: string[] = [`012 ${opts.name.slice(0, 80)}`, ...(opts.header ?? [])];

  const sorted = [...players].sort((a, b) => a.startRank! - b.startRank!);
  for (const p of sorted) {
    let points = 0;
    const cells: string[] = [];
    for (let r = 1; r < nextRound; r++) {
      const g = games.find((x) => x.round === r && (x.whiteId === p.id || x.blackId === p.id));
      if (!g) {
        // Not in this round at all (e.g. late entry): zero-point bye.
        cells.push(cell(0, "-", "Z"));
        continue;
      }
      const isWhite = g.whiteId === p.id;
      const [pw, pb] = gamePoints(g.kind, g.result);
      points += isWhite ? pw : pb;
      if (g.kind === "pab") cells.push(cell(0, "-", "U"));
      else if (g.kind === "half_bye") cells.push(cell(0, "-", "H"));
      else if (g.kind === "zero_bye") cells.push(cell(0, "-", "Z"));
      else {
        const opp = byId.get(isWhite ? g.blackId! : g.whiteId)!;
        const color = isWhite ? "w" : "b";
        let code: string;
        switch (g.result) {
          case "white": code = isWhite ? "1" : "0"; break;
          case "black": code = isWhite ? "0" : "1"; break;
          case "draw": code = "="; break;
          case "white_forfeit": code = isWhite ? "+" : "-"; break;
          case "black_forfeit": code = isWhite ? "-" : "+"; break;
          case "double_forfeit": code = "-"; break;
          default: throw new Error(`Round ${r} board ${g.board} has no result`);
        }
        // Forfeits were not played: TRF uses "-" as color for unplayed games against an opponent.
        const unplayed = g.result !== "white" && g.result !== "black" && g.result !== "draw";
        cells.push(cell(opp.startRank!, unplayed ? "-" : color, code));
      }
    }
    const pre = opts.preByes.find((b) => b.playerId === p.id);
    if (pre) cells.push(cell(0, "-", pre.kind === "half_bye" ? "H" : "Z"));
    else if (p.status === "withdrawn" && !opts.rankOf) cells.push(cell(0, "-", "Z"));

    const name = `${p.lastName}, ${p.firstName}`.replace(/,\s*$/, "");
    const line =
      "001 " +
      pad(p.startRank!, 4) +
      " " + // sex
      " " +
      "   " + // title
      " " +
      pad(name, 33, true) +
      " " +
      pad(p.rating ?? "", 4) +
      " " +
      pad(p.federation ?? "", 3, true) +
      " " +
      pad(p.fideId ?? "", 11) +
      " " +
      pad(p.birthYear ? `${p.birthYear}/00/00` : "", 10, true) +
      " " +
      fmtPoints(points) +
      " " +
      pad(opts.rankOf?.get(p.id) ?? p.startRank!, 4) +
      cells.join("");
    lines.push(line.trimEnd());
  }
  if (!opts.rankOf) {
    lines.push(`XXR ${opts.totalRounds}`);
    lines.push("XXC white1");
  }
  return lines.join("\n") + "\n";
}

function cell(opp: number, color: string, result: string) {
  return "  " + (opp === 0 ? "0000" : pad(opp, 4)) + " " + color + " " + result;
}

/** Parses bbpPairings output: first line = pair count, then "white black" by start rank ("x 0" = bye). */
export function parsePairingOutput(text: string): { white: number; black: number | null }[] {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const n = Number(lines[0]);
  const pairs = lines.slice(1).map((l) => {
    const [a, b] = l.split(/\s+/).map(Number);
    return { white: a, black: b === 0 ? null : b };
  });
  if (pairs.length !== n) throw new Error(`Expected ${n} pairs, got ${pairs.length}`);
  return pairs;
}
