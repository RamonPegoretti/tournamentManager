import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { buildTrf } from "./trf";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([["a", 'say "hi"', "x,y", null, 3]])).toBe('﻿a,"say ""hi""","x,y",,3\r\n');
  });
});

describe("TRF report mode", () => {
  it("writes header lines and final ranks without engine extensions", () => {
    const p = (id: string, n: number) => ({ id, firstName: "A", lastName: id, rating: 2000, fideId: null, federation: "ITA", birthYear: null, startRank: n, status: "active" as const });
    const trf = buildTrf({
      name: "Cup",
      totalRounds: 1,
      nextRound: 2,
      players: [p("x", 1), p("y", 2)],
      games: [{ round: 1, board: 1, kind: "game", whiteId: "x", blackId: "y", result: "black" }],
      preByes: [],
      header: ["022 Milano"],
      rankOf: new Map([["y", 1], ["x", 2]]),
    });
    const lines = trf.trim().split("\n");
    expect(lines[1]).toBe("022 Milano");
    expect(lines[2].slice(80, 89)).toBe(" 0.0    2");
    expect(lines[3].slice(80, 89)).toBe(" 1.0    1");
    expect(lines[2].slice(89)).toBe("     2 w 0");
    expect(trf).not.toContain("XXR");
  });
});
