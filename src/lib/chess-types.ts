/** Outcome of one pairing slot. `null` result means the game is still being played. */
export type GameResult =
  | "white" // 1-0
  | "black" // 0-1
  | "draw" // ½-½
  | "white_forfeit" // 1F-0F: White wins by forfeit
  | "black_forfeit" // 0F-1F: Black wins by forfeit
  | "double_forfeit"; // 0F-0F

/** A pairing slot: a game, or a bye given to `whiteId` alone. */
export type GameKind = "game" | "pab" | "half_bye" | "zero_bye";

export type PlayerLite = {
  id: string;
  firstName: string;
  lastName: string;
  rating: number | null;
  fideId: string | null;
  federation: string | null;
  birthYear: number | null;
  startRank: number | null;
  status: "active" | "withdrawn";
};

export type GameLite = {
  round: number;
  board: number;
  kind: GameKind;
  whiteId: string;
  blackId: string | null;
  result: GameResult | null;
};

export const RESULTS: GameResult[] = ["white", "draw", "black", "white_forfeit", "black_forfeit", "double_forfeit"];

/** Points for [white, black]. */
export function gamePoints(kind: GameKind, result: GameResult | null): [number, number] {
  if (kind === "pab") return [1, 0];
  if (kind === "half_bye") return [0.5, 0];
  if (kind === "zero_bye") return [0, 0];
  switch (result) {
    case "white":
    case "white_forfeit":
      return [1, 0];
    case "black":
    case "black_forfeit":
      return [0, 1];
    case "draw":
      return [0.5, 0.5];
    default:
      return [0, 0];
  }
}

/** True when the game was actually played over the board (counts for colors, ARO, played-game tiebreaks). */
export function wasPlayed(kind: GameKind, result: GameResult | null): boolean {
  return kind === "game" && (result === "white" || result === "black" || result === "draw");
}

export function resultLabel(kind: GameKind, result: GameResult | null): string {
  if (kind === "pab") return "1 (bye)";
  if (kind === "half_bye") return "½ (bye)";
  if (kind === "zero_bye") return "0 (bye)";
  switch (result) {
    case "white": return "1–0";
    case "black": return "0–1";
    case "draw": return "½–½";
    case "white_forfeit": return "+ / −";
    case "black_forfeit": return "− / +";
    case "double_forfeit": return "− / −";
    default: return "";
  }
}
