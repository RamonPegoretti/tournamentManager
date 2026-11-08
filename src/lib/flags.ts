import type { Player } from "@/db/schema";

export type PlayerFlag = "duplicateFide" | "duplicateName" | "noFide";

function nameKey(p: Pick<Player, "firstName" | "lastName">) {
  return `${p.lastName}|${p.firstName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Problems the organizer should look at before approving the player list. */
export function playerFlags(players: Pick<Player, "id" | "firstName" | "lastName" | "fideId" | "rating">[]) {
  const byFide = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const p of players) {
    if (p.fideId) byFide.set(p.fideId, (byFide.get(p.fideId) ?? 0) + 1);
    const k = nameKey(p);
    byName.set(k, (byName.get(k) ?? 0) + 1);
  }
  const flags = new Map<string, PlayerFlag[]>();
  for (const p of players) {
    const f: PlayerFlag[] = [];
    if (p.fideId && byFide.get(p.fideId)! > 1) f.push("duplicateFide");
    else if (byName.get(nameKey(p))! > 1) f.push("duplicateName");
    if (!p.fideId && p.rating !== null) f.push("noFide");
    flags.set(p.id, f);
  }
  return flags;
}
