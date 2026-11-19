import { describe, it, expect } from "vitest";
import { tournamentFromForm, playerFromForm, fieldErrors, registrationFromForm } from "./validation";

function fd(obj: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}

describe("tournamentFromForm", () => {
  it("accepts a Swiss setup and normalizes tiebreaks", () => {
    const r = tournamentFromForm(fd({ name: " Open ", format: "swiss", rounds: "7", tiebreaks: ["BH", "XX", "BH", "SB"] }));
    expect(r.success && r.data).toMatchObject({ name: "Open", rounds: 7, tiebreaks: ["BH", "SB"], location: null });
  });
  it("rejects missing name, bad rounds and reversed dates", () => {
    const r = tournamentFromForm(fd({ name: "", format: "swiss", rounds: "50", startDate: "2026-11-10", endDate: "2026-11-09" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toMatchObject({ name: "name", rounds: "rounds", endDate: "dates" });
  });
  it("drops rounds for round robin and tiebreaks for knockout", () => {
    const rr = tournamentFromForm(fd({ name: "A", format: "round_robin", rounds: "5", tiebreaks: ["SB"] }));
    expect(rr.success && rr.data.rounds).toBeNull();
    const ko = tournamentFromForm(fd({ name: "B", format: "knockout", rounds: "4", tiebreaks: ["SB"] }));
    expect(ko.success && ko.data.tiebreaks).toEqual([]);
  });
});

describe("playerFromForm", () => {
  it("treats empty rating as unrated", () => {
    const r = playerFromForm(fd({ firstName: "Ana", lastName: "Lopez", rating: "", fideId: "", federation: "esp" }));
    expect(r.success && r.data).toMatchObject({ rating: null, fideId: null, federation: "ESP" });
  });
  it("reports field errors", () => {
    const r = playerFromForm(fd({ lastName: "", rating: "500", fideId: "12a", email: "x" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toMatchObject({ lastName: "lastName", rating: "rating", fideId: "fideId", email: "email" });
  });
});

describe("registrationFromForm", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("requires an explicit rating choice", () => {
    const r = registrationFromForm(form({ firstName: "A", lastName: "B", email: "a@b.it" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain("ratingType");
  });
  it("requires a FIDE ID when the player says they are rated", () => {
    const r = registrationFromForm(form({ firstName: "A", lastName: "B", email: "a@b.it", ratingType: "fide", fideId: "" }));
    expect(r.error?.issues[0].message).toBe("fideId");
  });
  it("drops the FIDE ID for unrated players", () => {
    const r = registrationFromForm(form({ firstName: "A", lastName: "B", email: "a@b.it", ratingType: "unrated", fideId: "123" }));
    expect(r.data?.fields.fideId).toBeNull();
  });
});
