import { describe, it, expect } from "vitest";
import { parsePlayersFile, splitName } from "./players-import";

describe("parsePlayersFile", () => {
  it("reads English comma CSV", () => {
    const { rows } = parsePlayersFile(
      "First name,Last name,FIDE ID,Rating,Fed\nMagnus,Carlsen,1503014,2830,nor\nAnna,Rossi,,unrated,ITA\n",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].player).toMatchObject({ firstName: "Magnus", lastName: "Carlsen", fideId: "1503014", rating: 2830, federation: "NOR" });
    expect(rows[1].player).toMatchObject({ rating: null, fideId: null });
  });

  it("reads Italian semicolon CSV with full names", () => {
    const { rows } = parsePlayersFile("Giocatore;Elo;Circolo\nRossi, Mario;1850;Milano\n");
    expect(rows[0].player).toMatchObject({ firstName: "Mario", lastName: "Rossi", rating: 1850, club: "Milano" });
  });

  it("reads tab-separated paste from a spreadsheet", () => {
    const { rows } = parsePlayersFile("Nombre\tApellido\tElo\nLuis\tGarcía\t2100");
    expect(rows[0].player).toMatchObject({ firstName: "Luis", lastName: "García", rating: 2100 });
  });

  it("flags bad rows with line numbers", () => {
    const { rows } = parsePlayersFile("Name,Rating,Email\n,1500,\nBob Smith,99999,bob@\n");
    expect(rows[0]).toMatchObject({ line: 2, errors: ["missingName"] });
    expect(rows[1].errors).toEqual(["badRating", "badEmail"]);
  });

  it("reports a missing name column", () => {
    expect(parsePlayersFile("Rating\n1500").missingColumns).toEqual(["name"]);
  });
});

describe("splitName", () => {
  it("handles both orders", () => {
    expect(splitName("Rossi, Mario")).toEqual({ firstName: "Mario", lastName: "Rossi" });
    expect(splitName("Jan Krzysztof Duda")).toEqual({ firstName: "Jan Krzysztof", lastName: "Duda" });
  });
});
