import { describe, it, expect } from "vitest";
import { playerFlags } from "./flags";

const p = (id: string, firstName: string, lastName: string, fideId: string | null, rating: number | null = null) => ({
  id, firstName, lastName, fideId, rating,
});

describe("playerFlags", () => {
  it("flags duplicate FIDE IDs and names ignoring accents and case", () => {
    const f = playerFlags([
      p("1", "Mario", "Rossi", "123"),
      p("2", "M.", "Rossi", "123"),
      p("3", "José", "García", null),
      p("4", "jose", "garcia", null),
      p("5", "Ana", "Lopez", null, 1800),
    ]);
    expect(f.get("1")).toEqual(["duplicateFide"]);
    expect(f.get("3")).toEqual(["duplicateName"]);
    expect(f.get("4")).toEqual(["duplicateName"]);
    expect(f.get("5")).toEqual(["noFide"]);
  });
});

describe("FIDE check flags", () => {
  const base = { id: "x", firstName: "Magnus", lastName: "Carlsen", fideId: "1503014", rating: 2831 };
  it("flags lookups that failed or disagree", () => {
    const f = playerFlags([
      { ...base, id: "a", fideId: "1", lastName: "A", fideCheck: "notFound" },
      { ...base, id: "b", fideId: "2", lastName: "B", fideCheck: "unverified" },
      { ...base, id: "c", fideId: "3", firstName: "Anna", lastName: "Rossi", fideCheck: "ok", fideName: "Carlsen, Magnus", fideRating: 2831, rating: 2831 },
      { ...base, id: "d", fideId: "4", firstName: "Luca", lastName: "Bianchi", fideCheck: "ok", fideName: "Bianchi, Luca", fideRating: 1900, rating: 2000 },
      { ...base, id: "e", fideId: "5", firstName: "Sara", lastName: "Verdi", fideCheck: "ok", fideName: "Verdi, Sara", fideRating: 1800, rating: 1800 },
    ]);
    expect(f.get("a")).toEqual(["fideNotFound"]);
    expect(f.get("b")).toEqual(["fideUnverified"]);
    expect(f.get("c")).toEqual(["fideNameMismatch"]);
    expect(f.get("d")).toEqual(["fideRatingDiff"]);
    expect(f.get("e")).toEqual([]);
  });
  it("flags duplicate emails", () => {
    const f = playerFlags([
      { ...base, id: "a", fideId: null, rating: null, email: "A@x.it" },
      { ...base, id: "b", fideId: null, rating: null, firstName: "Other", email: "a@x.it" },
    ]);
    expect(f.get("b")).toEqual(["duplicateEmail"]);
  });
});
