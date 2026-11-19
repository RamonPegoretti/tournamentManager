CREATE TABLE "team_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"board" integer NOT NULL,
	"white_team_id" uuid NOT NULL,
	"black_team_id" uuid
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_tournament_name" UNIQUE("tournament_id","name")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "team_board" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "boards_per_team" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "team_system" text DEFAULT 'swiss' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_white_team_id_teams_id_fk" FOREIGN KEY ("white_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_black_team_id_teams_id_fk" FOREIGN KEY ("black_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_matches_tournament_idx" ON "team_matches" USING btree ("tournament_id","round");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_match_id_team_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."team_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;