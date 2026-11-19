import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const formatEnum = pgEnum("tournament_format", [
  "swiss",
  "round_robin",
  "knockout",
  "team",
]);

export const statusEnum = pgEnum("tournament_status", [
  "draft",
  "registration",
  "running",
  "finished",
]);

export const playerStatusEnum = pgEnum("player_status", [
  "active",
  "withdrawn",
]);

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    location: text("location"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    format: formatEnum("format").notNull().default("swiss"),
    rounds: integer("rounds"),
    timeControl: text("time_control"),
    // Ordered list of tiebreak codes, see src/lib/tiebreaks.ts
    tiebreaks: text("tiebreaks").array().notNull().default([]),
    status: statusEnum("status").notNull().default("draft"),
    // Public self-signup page accepts entries while true.
    registrationOpen: boolean("registration_open").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tournaments_owner_idx").on(t.ownerId)],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    fideId: text("fide_id"),
    // null means unrated
    rating: integer("rating"),
    federation: text("federation"),
    birthYear: integer("birth_year"),
    club: text("club"),
    email: text("email"),
    status: playerStatusEnum("status").notNull().default("active"),
    // Pairing number, fixed when the first round is paired.
    startRank: integer("start_rank"),
    // "organizer" (added or imported) or "self" (public signup page).
    source: text("source").notNull().default("organizer"),
    // Self-registered entries wait for the organizer to approve the list.
    approved: boolean("approved").notNull().default(true),
    // Result of the last FIDE lookup: ok | notFound | unverified, null when never checked.
    fideCheck: text("fide_check"),
    fideName: text("fide_name"),
    fideRating: integer("fide_rating"),
    // Secret for the "fix your registration" link.
    fixToken: text("fix_token").unique(),
    warningNote: text("warning_note"),
    warnedAt: timestamp("warned_at", { withTimezone: true }),
    fixedAt: timestamp("fixed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("players_tournament_idx").on(t.tournamentId)],
);

export const roundStatusEnum = pgEnum("round_status", ["paired", "finished"]);

export const gameKindEnum = pgEnum("game_kind", ["game", "pab", "half_bye", "zero_bye"]);

export const gameResultEnum = pgEnum("game_result", [
  "white",
  "black",
  "draw",
  "white_forfeit",
  "black_forfeit",
  "double_forfeit",
]);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    status: roundStatusEnum("status").notNull().default("paired"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("rounds_tournament_number").on(t.tournamentId, t.number)],
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    board: integer("board").notNull(),
    kind: gameKindEnum("kind").notNull().default("game"),
    whiteId: uuid("white_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    // null for byes
    blackId: uuid("black_id").references(() => players.id, { onDelete: "cascade" }),
    result: gameResultEnum("result"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_tournament_round_idx").on(t.tournamentId, t.round)],
);

export type Round = typeof rounds.$inferSelect;
export type Game = typeof games.$inferSelect;

export type Tournament = typeof tournaments.$inferSelect;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "denied"]);

/** A player's request to correct a game result; the organizer approves or denies it. */
export const resultRequests = pgTable(
  "result_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Result shown when the request was made, and the one the player asks for.
    currentResult: gameResultEnum("current_result"),
    proposedResult: gameResultEnum("proposed_result").notNull(),
    message: text("message"),
    status: requestStatusEnum("status").notNull().default("pending"),
    response: text("response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("result_requests_tournament_idx").on(t.tournamentId, t.status), index("result_requests_user_idx").on(t.userId)],
);

export type ResultRequest = typeof resultRequests.$inferSelect;
