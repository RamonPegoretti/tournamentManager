import { describe, expect, it } from "vitest";
import { bergerSchedule, roundRobinRounds } from "./berger";

describe("bergerSchedule", () => {
  it("matches the FIDE table for 6 players", () => {
    expect(bergerSchedule(6)).toEqual([
      [[1, 6], [2, 5], [3, 4]],
      [[6, 4], [5, 3], [1, 2]],
      [[2, 6], [3, 1], [4, 5]],
      [[6, 5], [1, 4], [2, 3]],
      [[3, 6], [4, 2], [5, 1]],
    ]);
  });
  it.each([3, 4, 5, 7, 8, 10, 13, 16])("every pair meets exactly once with %i players", (n) => {
    const s = bergerSchedule(n);
    expect(s).toHaveLength(roundRobinRounds(n));
    const met = new Set<string>();
    const whites = new Map<number, number>();
    for (const round of s) {
      const seen = new Set<number>();
      for (const [w, b] of round) {
        for (const x of [w, b]) if (x !== null) { expect(seen.has(x)).toBe(false); seen.add(x); }
        if (b === null) continue;
        const key = [w, b].sort((x, y) => x - y).join("-");
        expect(met.has(key)).toBe(false);
        met.add(key);
        whites.set(w, (whites.get(w) ?? 0) + 1);
      }
      expect(seen.size).toBe(n);
    }
    expect(met.size).toBe((n * (n - 1)) / 2);
    // Colours are balanced within one game for everybody.
    const games = n % 2 ? n - 1 : n - 1;
    for (let p = 1; p <= n; p++) expect(Math.abs(2 * (whites.get(p) ?? 0) - games)).toBeLessThanOrEqual(1);
  });
});
