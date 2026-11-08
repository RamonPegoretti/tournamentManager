import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  pgEnum,
  index,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("players_tournament_idx").on(t.tournamentId)],
);

export type Tournament = typeof tournaments.$inferSelect;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
