import { describe, it, expect } from "vitest";
import type { GameLite, GameResult, PlayerLite } from "./chess-types";
import { pairDutch } from "./pairing";
import { buildTrf } from "./trf";

function makePlayers(n: number): PlayerLite[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    rating: 2400 - i * 25,
    fideId: null,
    federation: "ITA",
    birthYear: null,
    startRank: i + 1,
    status: "active" as const,
  }));
}

// Deterministic "random" results.
function resultFor(round: number, board: number): GameResult {
  const v = (round * 7 + board * 13) % 5;
  return v < 2 ? "white" : v < 4 ? "black" : "draw";
}

describe("pairDutch", () => {
  it("pairs round 1 top half against bottom half with alternating colors", async () => {
    const players = makePlayers(8);
    const pairs = await pairDutch({ name: "T", totalRounds: 5, nextRound: 1, players, games: [], preByes: [] });
    expect(pairs.map((p) => [p.whiteId, p.blackId])).toEqual([
      ["p1", "p5"],
      ["p6", "p2"],
      ["p3", "p7"],
      ["p8", "p4"],
    ]);
  });

  it("runs a full 7-round, 15-player event with no repeat pairings and one bye per round", async () => {
    const players = makePlayers(15);
    const games: GameLite[] = [];
    const met = new Set<string>();
    const byes = new Set<string>();
    for (let r = 1; r <= 7; r++) {
      const preByes = r === 3 ? [{ playerId: "p2", kind: "half_bye" as const }] : [];
      const pairs = await pairDutch({ name: "T", totalRounds: 7, nextRound: r, players, games, preByes });
      const ids = pairs.flatMap((p) => [p.whiteId, p.blackId].filter(Boolean));
      expect(new Set(ids).size).toBe(15); // everyone appears exactly once
      for (const p of pairs) {
        if (p.kind === "game") {
          const key = [p.whiteId, p.blackId].sort().join("-");
          expect(met.has(key)).toBe(false);
          met.add(key);
        }
        if (p.kind === "pab") {
          expect(byes.has(p.whiteId)).toBe(false); // nobody gets two pairing-allocated byes
          byes.add(p.whiteId);
        }
        games.push({ round: r, board: p.board, kind: p.kind, whiteId: p.whiteId, blackId: p.blackId, result: p.kind === "game" ? resultFor(r, p.board) : null });
      }
      if (r === 3) expect(pairs.find((p) => p.whiteId === "p2")?.kind).toBe("half_bye");
    }
  });

  it("skips withdrawn players", async () => {
    const players = makePlayers(6);
    players[0].status = "withdrawn";
    const pairs = await pairDutch({ name: "T", totalRounds: 5, nextRound: 1, players, games: [], preByes: [] });
    expect(pairs.flatMap((p) => [p.whiteId, p.blackId])).not.toContain("p1");
    expect(pairs.find((p) => p.kind === "pab")).toBeTruthy();
  });

  it("rejects missing results", () => {
    const players = makePlayers(2);
    expect(() =>
      buildTrf({ name: "T", totalRounds: 3, nextRound: 2, players, preByes: [], games: [{ round: 1, board: 1, kind: "game", whiteId: "p1", blackId: "p2", result: null }] }),
    ).toThrow(/no result/);
  });
});
