ALTER TABLE "profiles" ADD COLUMN "split_needs" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "split_wants" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "split_savings" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_split" CHECK ("profiles"."split_needs" >= 0 AND "profiles"."split_wants" >= 0 AND "profiles"."split_savings" >= 0 AND "profiles"."split_needs" + "profiles"."split_wants" + "profiles"."split_savings" = 100);