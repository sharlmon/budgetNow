CREATE TABLE "bills" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" text NOT NULL,
	"frequency" text NOT NULL,
	"next_due" date NOT NULL,
	"anchor_day" integer NOT NULL,
	"auto" boolean DEFAULT false NOT NULL,
	"debt_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "bills_category" CHECK ("bills"."category" IN ('needs','wants','debt')),
	CONSTRAINT "bills_frequency" CHECK ("bills"."frequency" IN ('week','month','year')),
	CONSTRAINT "bills_amount" CHECK ("bills"."amount" >= 0),
	CONSTRAINT "bills_anchor" CHECK ("bills"."anchor_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"original" numeric(14, 2),
	"min_payment" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "debts_nonneg" CHECK ("debts"."balance" >= 0 AND "debts"."min_payment" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" text NOT NULL,
	"date" date NOT NULL,
	"debt_id" text,
	"bill_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "expenses_category" CHECK ("expenses"."category" IN ('needs','wants','savings','debt')),
	CONSTRAINT "expenses_nonneg" CHECK ("expenses"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"goal_id" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "goal_contributions_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"target" numeric(14, 2) NOT NULL,
	"icon" text DEFAULT 'target' NOT NULL,
	"color" text DEFAULT '#ef6a3a' NOT NULL,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "goals_target" CHECK ("goals"."target" > 0)
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"needs" numeric(14, 2) NOT NULL,
	"wants" numeric(14, 2) NOT NULL,
	"savings" numeric(14, 2) NOT NULL,
	"debt" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incomes_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "incomes_nonneg" CHECK ("incomes"."amount" >= 0 AND "incomes"."needs" >= 0 AND "incomes"."wants" >= 0 AND "incomes"."savings" >= 0 AND "incomes"."debt" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_goal_id_goals_user_id_id_fk" FOREIGN KEY ("user_id","goal_id") REFERENCES "public"."goals"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_user_date" ON "expenses" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "goal_contrib_goal" ON "goal_contributions" USING btree ("user_id","goal_id");--> statement-breakpoint
CREATE INDEX "incomes_user_date" ON "incomes" USING btree ("user_id","date");