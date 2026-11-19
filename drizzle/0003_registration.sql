ALTER TABLE "players" ADD COLUMN "source" text DEFAULT 'organizer' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "approved" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fide_check" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fide_name" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fide_rating" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fix_token" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "warning_note" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "warned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fixed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "registration_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_fix_token_unique" UNIQUE("fix_token");