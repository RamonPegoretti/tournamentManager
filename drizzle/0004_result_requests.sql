CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TABLE "result_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"current_result" "game_result",
	"proposed_result" "game_result" NOT NULL,
	"message" text,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "result_requests" ADD CONSTRAINT "result_requests_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_requests" ADD CONSTRAINT "result_requests_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_requests" ADD CONSTRAINT "result_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "result_requests_tournament_idx" ON "result_requests" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "result_requests_user_idx" ON "result_requests" USING btree ("user_id");