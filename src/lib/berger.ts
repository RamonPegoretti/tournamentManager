/**
 * FIDE Berger tables. Returns, for each round, the pairs as [white, black] start ranks.
 * With an odd number of players, `black` is null for the player who has the bye that round.
 */
export function bergerSchedule(players: number): [number, number | null][][] {
  if (players < 2) return [];
  const n = players % 2 ? players + 1 : players;
  const ring = n - 1;
  const half = n / 2;
  // Round 1: 1–n, 2–(n-1), 3–(n-2), …
  let pairs: [number, number][] = [[1, n]];
  for (let i = 2; i <= half; i++) pairs.push([i, n + 1 - i]);
  const rounds: [number, number][][] = [];
  for (let r = 0; r < ring; r++) {
    rounds.push(pairs);
    // Next round: every ring number moves up by n/2; player n swaps colour each round.
    const shift = (x: number) => ((x - 1 + half) % ring) + 1;
    const [first, ...rest] = pairs;
    const ringPlayer = shift(first[0] === n ? first[1] : first[0]);
    const nextFirst: [number, number] = r % 2 === 0 ? [n, ringPlayer] : [ringPlayer, n];
    pairs = [nextFirst, ...rest.map(([w, b]) => [shift(w), shift(b)] as [number, number])];
  }
  const dummy = players % 2 ? n : 0;
  return rounds.map((round) =>
    round.map(([w, b]) => (w === dummy ? [b, null] : b === dummy ? [w, null] : [w, b]) as [number, number | null]),
  );
}

export const roundRobinRounds = (players: number) => (players < 2 ? 0 : players % 2 ? players : players - 1);
