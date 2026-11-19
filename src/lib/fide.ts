/** Parsing of the public FIDE profile page (ratings.fide.com/profile/<id>). */

export type FideProfile = {
  fideId: string;
  name: string; // "Last, First" as FIDE writes it
  rating: number | null; // standard rating, null when FIDE lists the player as unrated
  federation: string | null; // country name as shown on the profile
  birthYear: number | null;
};

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function rowValue(html: string, label: RegExp): string | null {
  // Profile rows look like: <div class="...header">Federation:</div><div class="...data">Italy</div>
  const re = new RegExp(label.source + String.raw`\s*:?\s*</div>\s*<div[^>]*>([\s\S]*?)</div>`, "i");
  const m = html.match(re);
  return m ? decode(m[1]) || null : null;
}

/** Returns null when the page does not describe a player (unknown FIDE ID). */
export function parseFideProfile(fideId: string, html: string): FideProfile | null {
  const title = html.match(/class="[^"]*profile-top-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const name = title ? decode(title[1]) : "";
  if (!name) return null;

  let rating: number | null = null;
  const std = html.match(/>\s*std\s*<\/span>([\s\S]{0,80})/i);
  if (std) {
    const n = decode(std[1]).match(/^(\d{3,4})\b/);
    rating = n ? Number(n[1]) : null;
  }
  const by = rowValue(html, /B-Year/);
  const year = by && /^\d{4}$/.test(by) ? Number(by) : null;
  return { fideId, name, rating, federation: rowValue(html, /Federation/), birthYear: year };
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .split(" ")
    .filter(Boolean);

/** True when the name typed by the player plausibly matches the FIDE record. */
export function fideNameMatches(fideName: string, first: string, last: string): boolean {
  const fide = new Set(norm(fideName));
  const lastParts = norm(last);
  if (!lastParts.length || !lastParts.every((p) => fide.has(p))) return false;
  const firstParts = norm(first);
  // First names are often abbreviated on FIDE ("Carlsen, M."), so only the initial must match.
  return !firstParts.length || [...fide].some((p) => p[0] === firstParts[0][0]);
}

/** Rating to store for a player: FIDE wins; null means unrated. */
export function ratingFromProfile(p: FideProfile | null): number | null {
  return p?.rating ?? null;
}
