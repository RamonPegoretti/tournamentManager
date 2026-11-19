CREATE TYPE "public"."game_kind" AS ENUM('game', 'pab', 'half_bye', 'zero_bye');--> statement-breakpoint
CREATE TYPE "public"."game_result" AS ENUM('white', 'black', 'draw', 'white_forfeit', 'black_forfeit', 'double_forfeit');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('paired', 'finished');--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"board" integer NOT NULL,
	"kind" "game_kind" DEFAULT 'game' NOT NULL,
	"white_id" uuid NOT NULL,
	"black_id" uuid,
	"result" "game_result",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" "round_status" DEFAULT 'paired' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rounds_tournament_number" UNIQUE("tournament_id","number")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "start_rank" integer;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_id_players_id_fk" FOREIGN KEY ("white_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_id_players_id_fk" FOREIGN KEY ("black_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_tournament_round_idx" ON "games" USING btree ("tournament_id","round");