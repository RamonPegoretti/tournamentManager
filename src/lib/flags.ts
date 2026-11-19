import type { Player } from "@/db/schema";
import { fideNameMatches } from "./fide";

export type PlayerFlag =
  | "duplicateFide"
  | "duplicateName"
  | "duplicateEmail"
  | "noFide"
  | "fideNotFound"
  | "fideUnverified"
  | "fideNameMismatch"
  | "fideRatingDiff";

type FlagInput = Pick<Player, "id" | "firstName" | "lastName" | "fideId" | "rating"> &
  Partial<Pick<Player, "email" | "fideCheck" | "fideName" | "fideRating">>;

function nameKey(p: Pick<Player, "firstName" | "lastName">) {
  return `${p.lastName}|${p.firstName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function counter<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return (i: T) => {
    const k = key(i);
    return k ? m.get(k)! : 0;
  };
}

/** Problems the organizer should look at before approving the player list. */
export function playerFlags(players: FlagInput[]) {
  const fide = counter(players, (p) => p.fideId);
  const name = counter(players, nameKey);
  const email = counter(players, (p) => p.email?.toLowerCase());
  const flags = new Map<string, PlayerFlag[]>();
  for (const p of players) {
    const f: PlayerFlag[] = [];
    if (fide(p) > 1) f.push("duplicateFide");
    else if (name(p) > 1) f.push("duplicateName");
    else if (email(p) > 1) f.push("duplicateEmail");
    if (!p.fideId && p.rating !== null) f.push("noFide");
    if (p.fideId && p.fideCheck === "notFound") f.push("fideNotFound");
    if (p.fideId && p.fideCheck === "unverified") f.push("fideUnverified");
    if (p.fideId && p.fideCheck === "ok") {
      if (p.fideName && !fideNameMatches(p.fideName, p.firstName, p.lastName)) f.push("fideNameMismatch");
      if ((p.fideRating ?? null) !== p.rating) f.push("fideRatingDiff");
    }
    flags.set(p.id, f);
  }
  return flags;
}
