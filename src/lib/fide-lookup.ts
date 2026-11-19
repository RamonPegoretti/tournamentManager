import "server-only";
import { parseFideProfile, type FideProfile } from "./fide";

export type FideLookup = { status: "ok"; profile: FideProfile } | { status: "notFound" } | { status: "unverified"; reason?: string };

/** Fetch a player's FIDE profile. Never throws: network problems give "unverified". */
export async function lookupFide(fideId: string): Promise<FideLookup> {
  if (!/^\d{1,10}$/.test(fideId)) return { status: "notFound" };
  try {
    const res = await fetch(`${process.env.FIDE_PROFILE_URL ?? "https://ratings.fide.com/profile/"}${fideId}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; tournamentManager)" },
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return { status: "notFound" };
    if (!res.ok) return { status: "unverified", reason: `http ${res.status}` };
    const profile = parseFideProfile(fideId, await res.text());
    return profile ? { status: "ok", profile } : { status: "notFound" };
  } catch (e) {
    return { status: "unverified", reason: e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 120) : "error" };
  }
}

/** Look up several IDs with limited parallelism. */
export async function lookupMany(ids: string[], parallel = 5): Promise<Map<string, FideLookup>> {
  const out = new Map<string, FideLookup>();
  const queue = [...new Set(ids)];
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) out.set(id, await lookupFide(id));
    }),
  );
  return out;
}

/** Columns to store on a player after looking up their FIDE ID. */
export async function fideColumns(fideId: string | null) {
  if (!fideId) return { fideCheck: null, fideName: null, fideRating: null };
  const r = await lookupFide(fideId);
  return r.status === "ok"
    ? { fideCheck: "ok", fideName: r.profile.name, fideRating: r.profile.rating }
    : { fideCheck: r.status, fideName: null, fideRating: null };
}
