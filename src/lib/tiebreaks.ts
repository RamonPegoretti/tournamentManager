import type { Tournament } from "@/db/schema";

export type Format = Tournament["format"];

/** Tiebreaks offered at setup. Codes follow FIDE Handbook C.07 naming. */
export const TIEBREAKS = [
  "BH-C1", // Buchholz Cut 1
  "BH", // Buchholz
  "BH-M1", // Median Buchholz 1
  "SB", // Sonneborn-Berger
  "DE", // Direct encounter
  "WIN", // Number of wins
  "BPG", // Games played with Black
  "ARO", // Average rating of opponents
  "PS", // Progressive score
  "KS", // Koya system (round robin)
] as const;

export type TiebreakCode = (typeof TIEBREAKS)[number];

export const DEFAULT_TIEBREAKS: Record<Format, TiebreakCode[]> = {
  swiss: ["BH-C1", "BH", "SB", "DE", "WIN"],
  round_robin: ["DE", "SB", "WIN", "KS"],
  knockout: [],
  team: ["SB", "BH", "DE"],
};

export function isTiebreak(code: string): code is TiebreakCode {
  return (TIEBREAKS as readonly string[]).includes(code);
}

/** Keep only known codes, drop duplicates, keep the given order. */
export function normalizeTiebreaks(codes: string[]): TiebreakCode[] {
  const seen = new Set<string>();
  const out: TiebreakCode[] = [];
  for (const c of codes) {
    if (isTiebreak(c) && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

/** Suggested number of Swiss rounds for a player count (ceil(log2 n) + 1, min 3). */
export function suggestedSwissRounds(playerCount: number): number {
  if (playerCount < 2) return 5;
  return Math.max(3, Math.ceil(Math.log2(playerCount)) + 1);
}
