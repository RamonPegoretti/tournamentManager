import { z } from "zod";
import { normalizeTiebreaks } from "./tiebreaks";

const optText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/** Fields of the tournament setup form. Error messages are i18n keys under "setup.errors". */
export const tournamentInput = z
  .object({
    name: z.string().trim().min(1, "name").max(120, "name"),
    location: optText,
    startDate: optDate,
    endDate: optDate,
    format: z.enum(["swiss", "round_robin", "knockout", "team"]),
    rounds: z.coerce.number().int("rounds").min(1, "rounds").max(30, "rounds").nullable(),
    timeControl: optText,
    tiebreaks: z.array(z.string()).transform(normalizeTiebreaks),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: "dates", path: ["endDate"] });

export type TournamentInput = z.infer<typeof tournamentInput>;

export function tournamentFromForm(form: FormData) {
  const rounds = String(form.get("rounds") ?? "").trim();
  const format = String(form.get("format") ?? "swiss");
  return tournamentInput.safeParse({
    name: form.get("name") ?? "",
    location: form.get("location") ?? "",
    startDate: form.get("startDate") ?? "",
    endDate: form.get("endDate") ?? "",
    format,
    // Round robin rounds follow from the player count; keep it empty there.
    rounds: rounds === "" || format === "round_robin" ? null : rounds,
    timeControl: form.get("timeControl") ?? "",
    tiebreaks: format === "knockout" ? [] : form.getAll("tiebreaks").map(String),
  });
}

/** Fields of the add-player form. Error messages are i18n keys under "player.errors". */
export const playerInput = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().min(1, "lastName").max(80, "lastName"),
  fideId: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,10}$/.test(v), "fideId")
    .transform((v) => v || null),
  rating: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && +v >= 1000 && +v <= 3000), "rating")
    .transform((v) => (v ? Number(v) : null)),
  federation: z
    .string()
    .trim()
    .transform((v) => (v ? v.toUpperCase().slice(0, 3) : null)),
  birthYear: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= new Date().getFullYear()), "birthYear")
    .transform((v) => (v ? Number(v) : null)),
  club: z.string().trim().max(120).transform((v) => v || null),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "email")
    .transform((v) => v || null),
});

export function playerFromForm(form: FormData) {
  const get = (k: string) => String(form.get(k) ?? "");
  return playerInput.safeParse({
    firstName: get("firstName"),
    lastName: get("lastName"),
    fideId: get("fideId"),
    rating: get("rating"),
    federation: get("federation"),
    birthYear: get("birthYear"),
    club: get("club"),
    email: get("email"),
  });
}

/** Turn a zod error into { field: messageKey }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
