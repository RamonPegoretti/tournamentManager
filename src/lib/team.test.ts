import { describe, expect, it } from "vitest";
import { matchBoards, matchScore, teamStandings } from "./team";

const teamOf = (id: string) => id[0]; // players "a1", "b2" belong to teams "a", "b"

describe("team matches", () => {
  it("alternates colours by board and forfeits missing players", () => {
    expect(matchBoards(["a1", "a2", "a3"], ["b1", "b2"], 4)).toEqual([
      { kind: "game", whiteId: "a1", blackId: "b1" },
      { kind: "game", whiteId: "b2", blackId: "a2" },
      { kind: "pab", whiteId: "a3", blackId: null },
    ]);
  });
  it("scores matches and ranks by match points then game points", () => {
    const teams = ["a", "b", "c", "d"].map((id, i) => ({ id, name: id.toUpperCase(), startRank: i + 1 }));
    const matches = [
      { id: "m1", round: 1, board: 1, whiteTeamId: "a", blackTeamId: "b" },
      { id: "m2", round: 1, board: 2, whiteTeamId: "c", blackTeamId: "d" },
    ];
    const games = [
      { matchId: "m1", kind: "game" as const, result: "white" as const, whiteId: "a1", blackId: "b1" },
      { matchId: "m1", kind: "game" as const, result: "draw" as const, whiteId: "b2", blackId: "a2" },
      { matchId: "m2", kind: "game" as const, result: "draw" as const, whiteId: "c1", blackId: "d1" },
      { matchId: "m2", kind: "game" as const, result: "draw" as const, whiteId: "d2", blackId: "c2" },
    ];
    expect(matchScore(matches[0], games, teamOf, 2)).toEqual([1.5, 0.5]);
    const rows = teamStandings(teams, matches, games, teamOf, 2, 1);
    expect(rows.map((r) => [r.team.id, r.rank, r.mp, r.gp])).toEqual([
      ["a", 1, 2, 1.5],
      ["c", 2, 1, 1],
      ["d", 2, 1, 1],
      ["b", 4, 0, 0.5],
    ]);
  });
  it("waits for unfinished games", () => {
    const m = { id: "m", round: 1, board: 1, whiteTeamId: "a", blackTeamId: "b" };
    expect(matchScore(m, [{ matchId: "m", kind: "game", result: null, whiteId: "a1", blackId: "b1" }], teamOf, 1)).toBeNull();
  });
});
