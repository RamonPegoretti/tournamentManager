import { describe, it, expect } from "vitest";
import type { GameLite, PlayerLite } from "./chess-types";
import { computeStandings } from "./standings";

const P = (n: number, rating: number | null = 2000 - n * 10): PlayerLite => ({
  id: `p${n}`, firstName: "F", lastName: `L${n}`, rating, fideId: null, federation: null, birthYear: null, startRank: n, status: "active",
});
const G = (round: number, board: number, w: number, b: number | null, result: GameLite["result"], kind: GameLite["kind"] = "game"): GameLite => ({
  round, board, kind, whiteId: `p${w}`, blackId: b ? `p${b}` : null, result,
});

describe("computeStandings", () => {
  // 4 players, 3 rounds round-robin-like:
  // R1: 1-2 1-0, 3-4 ½   R2: 1-3 ½, 4-2 0-1   R3: 4-1 0-1, 2-3 1-0
  const players = [P(1), P(2), P(3), P(4)];
  const games = [
    G(1, 1, 1, 2, "white"), G(1, 2, 3, 4, "draw"),
    G(2, 1, 1, 3, "draw"), G(2, 2, 4, 2, "black"),
    G(3, 1, 4, 1, "black"), G(3, 2, 2, 3, "white"),
  ];

  it("totals points and orders by points", () => {
    const rows = computeStandings(players, games, ["BH", "SB", "WIN"], 3);
    expect(rows.map((r) => [r.player.id, r.points])).toEqual([["p1", 2.5], ["p2", 2], ["p3", 1], ["p4", 0.5]]);
  });

  it("computes Buchholz, Sonneborn-Berger, wins, progressive and ARO", () => {
    const rows = computeStandings(players, games, ["BH", "BH-C1", "SB", "WIN", "PS", "ARO", "BPG"], 3);
    const p1 = rows.find((r) => r.player.id === "p1")!;
    // opponents p2 (2), p3 (1), p4 (0.5)
    expect(p1.tiebreaks.BH).toBe(3.5);
    expect(p1.tiebreaks["BH-C1"]).toBe(3);
    expect(p1.tiebreaks.SB).toBe(2 + 0.5 + 0.5);
    expect(p1.tiebreaks.WIN).toBe(2);
    expect(p1.tiebreaks.PS).toBe(1 + 1.5 + 2.5);
    expect(p1.tiebreaks.ARO).toBe(Math.round((1980 + 1970 + 1960) / 3));
    expect(p1.tiebreaks.BPG).toBe(1);
  });

  it("uses a virtual opponent for byes and counts opponents' byes as draws", () => {
    const ps = [P(1), P(2), P(3)];
    const gs = [G(1, 1, 1, 2, "white"), G(1, 2, 3, null, null, "pab"), G(2, 1, 3, 1, "black"), G(2, 2, 2, null, null, "pab")];
    const rows = computeStandings(ps, gs, ["BH"], 2);
    const p1 = rows.find((r) => r.player.id === "p1")!;
    // p1: 2 points. opponents: p2 (0 played + bye counted 0.5 = 0.5), p3 (bye 0.5 + loss 0 = 0.5)
    expect(p1.tiebreaks.BH).toBe(1);
    const p3 = rows.find((r) => r.player.id === "p3")!;
    // p3: 1 point (bye). Round 1 virtual opponent = own score 1; round 2 opponent p1 adjusted 2.
    expect(p3.tiebreaks.BH).toBe(3);
  });

  it("applies direct encounter only inside a fully-met tie group and shares ranks on full ties", () => {
    const ps = [P(1), P(2), P(3), P(4)];
    const gs = [G(1, 1, 1, 2, "black"), G(1, 2, 3, 4, "white")];
    const rows = computeStandings(ps, gs, ["DE"], 1);
    // p2 and p3 have 1 pt but never met -> DE 0 each -> shared rank 1
    expect(rows.slice(0, 2).map((r) => r.rank)).toEqual([1, 1]);
    const rows2 = computeStandings([P(1), P(2)], [G(1, 1, 1, 2, "draw")], ["DE"], 1);
    expect(rows2.map((r) => r.tiebreaks.DE)).toEqual([0.5, 0.5]);
  });

  it("ignores rounds that aren't finished", () => {
    const rows = computeStandings(players, games, [], 1);
    expect(rows[0].points).toBe(1);
  });
});
