import { describe, expect, it } from "vitest";
import { bracketSize, firstRound, nextRound, seedOrder, slotWinner } from "./knockout";

describe("knockout", () => {
  it("seeds the bracket so 1 and 2 can only meet in the final", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(bracketSize(5)).toBe(8);
  });
  it("gives byes to the top seeds", () => {
    expect(firstRound(6)).toEqual([
      { white: 1, black: null },
      { white: 4, black: 5 },
      { white: 2, black: null },
      { white: 3, black: 6 },
    ]);
  });
  it("advances winners and waits for missing results", () => {
    const r1 = firstRound(6).map((p, i) => ({ ...p, result: p.black ? (i === 1 ? "black" : "white") : null }) as const);
    expect(nextRound(r1, 2)).toEqual([
      { white: 5, black: 1 },
      { white: 3, black: 2 },
    ]);
    expect(nextRound([{ white: 1, black: 2, result: null }], 2)).toBeNull();
    expect(slotWinner({ white: 1, black: 2, result: "draw" })).toBeUndefined();
  });
  it("a double forfeit sends the next opponent through", () => {
    expect(nextRound([
      { white: 1, black: 4, result: "double_forfeit" },
      { white: 2, black: 3, result: "white" },
    ], 2)).toEqual([{ white: 2, black: null }]);
  });
});
