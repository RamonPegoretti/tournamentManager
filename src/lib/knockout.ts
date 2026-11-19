import type { GameResult } from "./chess-types";

export const bracketSize = (n: number) => (n < 2 ? 2 : 2 ** Math.ceil(Math.log2(n)));
export const knockoutRounds = (n: number) => Math.log2(bracketSize(n));

/** Seed positions in bracket order, e.g. 8 → [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((s) => [s, sum - s]);
  }
  return order;
}

/** A bracket slot: two seeds, or one seed and a bye. Index in the array = board - 1. */
export type KoPair = { white: number; black: number | null };

/** Round 1: top seeds get the byes when the field is not a power of two. */
export function firstRound(players: number): KoPair[] {
  const order = seedOrder(bracketSize(players));
  const pairs: KoPair[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const [a, b] = [order[i], order[i + 1]].sort((x, y) => x - y);
    pairs.push(b > players ? { white: a, black: null } : { white: a, black: b });
  }
  return pairs;
}

/** Who goes through from one slot: a seed, or null when nobody does (double forfeit). */
export function slotWinner(p: { white: number; black: number | null; result: GameResult | null } | null): number | null | undefined {
  if (p === null) return null; // empty slot
  if (p.black === null) return p.white;
  switch (p.result) {
    case "white":
    case "white_forfeit":
      return p.white;
    case "black":
    case "black_forfeit":
      return p.black;
    case "double_forfeit":
      return null;
    default:
      return undefined; // not decided yet (or a draw, which a knockout can't use)
  }
}

/**
 * Next round from the previous one (in board order). Winners of boards 2k-1 and 2k meet.
 * The better seed has White in odd rounds and Black in even rounds. Returns null if a slot is undecided.
 */
export function nextRound(prev: ({ white: number; black: number | null; result: GameResult | null } | null)[], round: number): (KoPair | null)[] | null {
  const winners = prev.map(slotWinner);
  if (winners.some((w) => w === undefined)) return null;
  const out: (KoPair | null)[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    const [a, b] = [winners[i], winners[i + 1]] as (number | null)[];
    if (a === null && b === null) out.push(null);
    else if (a === null || b === null) out.push({ white: (a ?? b)!, black: null });
    else {
      const [hi, lo] = a < b ? [a, b] : [b, a];
      out.push(round % 2 ? { white: hi, black: lo } : { white: lo, black: hi });
    }
  }
  return out;
}
