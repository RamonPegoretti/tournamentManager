import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fideNameMatches, parseFideProfile } from "./fide";

const html = readFileSync(new URL("./__fixtures__/fide-profile.html", import.meta.url), "utf8");

describe("parseFideProfile", () => {
  it("reads name, standard rating, federation and birth year", () => {
    expect(parseFideProfile("1503014", html)).toEqual({
      fideId: "1503014",
      name: "Carlsen, Magnus",
      rating: 2831,
      federation: "Norway",
      birthYear: 1990,
    });
  });
  it("treats 'Not rated' as unrated", () => {
    const p = parseFideProfile("1", html.replace(" 2831 ", " Not rated "));
    expect(p?.rating).toBeNull();
  });
  it("returns null for a page without a player", () => {
    expect(parseFideProfile("9", "<html><body>No record</body></html>")).toBeNull();
  });
});

describe("fideNameMatches", () => {
  it("accepts accents, case and abbreviated first names", () => {
    expect(fideNameMatches("Carlsen, Magnus", "magnus", "CARLSEN")).toBe(true);
    expect(fideNameMatches("Caruana, F.", "Fabiano", "Caruana")).toBe(true);
    expect(fideNameMatches("Gonzalez Perez, Jose", "José", "González Pérez")).toBe(true);
  });
  it("rejects a different person", () => {
    expect(fideNameMatches("Carlsen, Magnus", "Hikaru", "Nakamura")).toBe(false);
    expect(fideNameMatches("Carlsen, Magnus", "Henrik", "Carlsen")).toBe(false);
  });
});
