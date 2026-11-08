import { describe, it, expect } from "vitest";
import { playerFlags } from "./flags";

const p = (id: string, firstName: string, lastName: string, fideId: string | null, rating: number | null = null) => ({
  id, firstName, lastName, fideId, rating,
});

describe("playerFlags", () => {
  it("flags duplicate FIDE IDs and names ignoring accents and case", () => {
    const f = playerFlags([
      p("1", "Mario", "Rossi", "123"),
      p("2", "M.", "Rossi", "123"),
      p("3", "José", "García", null),
      p("4", "jose", "garcia", null),
      p("5", "Ana", "Lopez", null, 1800),
    ]);
    expect(f.get("1")).toEqual(["duplicateFide"]);
    expect(f.get("3")).toEqual(["duplicateName"]);
    expect(f.get("4")).toEqual(["duplicateName"]);
    expect(f.get("5")).toEqual(["noFide"]);
  });
});
