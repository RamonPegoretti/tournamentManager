import Papa from "papaparse";

export type ImportedPlayer = {
  firstName: string;
  lastName: string;
  fideId: string | null;
  rating: number | null;
  federation: string | null;
  birthYear: number | null;
  club: string | null;
  email: string | null;
};

export type ImportRow = {
  line: number;
  player: ImportedPlayer | null;
  errors: string[];
};

// Header aliases in English, Italian and Spanish (lowercased, no spaces/punctuation).
const ALIASES: Record<keyof ImportedPlayer | "name", string[]> = {
  firstName: ["firstname", "first", "givenname", "nome", "nombre"],
  lastName: ["lastname", "last", "surname", "familyname", "cognome", "apellido", "apellidos"],
  name: ["name", "fullname", "player", "giocatore", "jugador", "nomecompleto", "nombrecompleto"],
  fideId: ["fideid", "fide", "idfide", "fidenumber"],
  rating: ["rating", "elo", "fiderating", "eloFide".toLowerCase(), "punteggio"],
  federation: ["federation", "fed", "country", "federazione", "federacion", "federación", "paese", "pais"],
  birthYear: ["birthyear", "born", "yob", "year", "annonascita", "anno", "añonacimiento", "anonacimiento"],
  club: ["club", "circolo", "società", "societa"],
  email: ["email", "mail", "e-mail", "correo"],
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_.\-()]/g, "");
}

function mapHeaders(headers: string[]): Partial<Record<keyof typeof ALIASES, number>> {
  const map: Partial<Record<keyof typeof ALIASES, number>> = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    for (const [key, aliases] of Object.entries(ALIASES) as [keyof typeof ALIASES, string[]][]) {
      if (map[key] === undefined && aliases.map(normHeader).includes(n)) {
        map[key] = i;
        break;
      }
    }
  });
  return map;
}

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

const UNRATED = new Set(["unrated", "nc", "n/a", "na", "-", "0", "senza", "sin"]);

/** Split "Last, First" or "First Last". */
export function splitName(full: string): { firstName: string; lastName: string } {
  const t = full.trim().replace(/\s+/g, " ");
  if (t.includes(",")) {
    const [last, ...rest] = t.split(",");
    return { firstName: rest.join(",").trim(), lastName: last.trim() };
  }
  const parts = t.split(" ");
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function parsePlayersFile(text: string): { rows: ImportRow[]; missingColumns: string[] } {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
    delimiter: "", // auto-detect: comma, semicolon, tab (paste from Excel)
  });
  const data = parsed.data;
  if (data.length === 0) return { rows: [], missingColumns: ["name"] };

  const map = mapHeaders(data[0]);
  const hasName = map.name !== undefined || map.lastName !== undefined;
  if (!hasName) return { rows: [], missingColumns: ["name"] };

  const rows: ImportRow[] = data.slice(1).map((cells, idx) => {
    const errors: string[] = [];
    const get = (k: keyof typeof ALIASES) => (map[k] === undefined ? null : clean(cells[map[k]!]));

    let firstName = get("firstName") ?? "";
    let lastName = get("lastName") ?? "";
    if (!lastName && get("name")) ({ firstName, lastName } = splitName(get("name")!));
    if (!lastName) errors.push("missingName");

    const fideRaw = get("fideId");
    const fideId = fideRaw ? fideRaw.replace(/\D/g, "") || null : null;
    if (fideRaw && !fideId) errors.push("badFideId");

    let rating: number | null = null;
    const ratingRaw = get("rating");
    if (ratingRaw && !UNRATED.has(ratingRaw.toLowerCase())) {
      const n = Number(ratingRaw);
      if (!Number.isInteger(n) || n < 1000 || n > 3000) errors.push("badRating");
      else rating = n;
    }

    let birthYear: number | null = null;
    const byRaw = get("birthYear");
    if (byRaw) {
      const n = Number(byRaw);
      if (!Number.isInteger(n) || n < 1900 || n > new Date().getFullYear()) errors.push("badBirthYear");
      else birthYear = n;
    }

    const fed = get("federation");
    const federation = fed ? fed.toUpperCase().slice(0, 3) : null;

    const email = get("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("badEmail");

    return {
      line: idx + 2,
      errors,
      player: errors.length
        ? null
        : { firstName, lastName, fideId, rating, federation, birthYear, club: get("club"), email },
    };
  });

  return { rows, missingColumns: [] };
}
