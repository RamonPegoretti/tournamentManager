ALTER TABLE "games" DROP CONSTRAINT "games_white_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_black_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_id_players_id_fk" FOREIGN KEY ("white_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_id_players_id_fk" FOREIGN KEY ("black_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;