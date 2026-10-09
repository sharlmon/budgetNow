ALTER TABLE "bills" ADD COLUMN "rev" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "rev" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "rev" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "rev" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "rev" integer DEFAULT 1 NOT NULL;