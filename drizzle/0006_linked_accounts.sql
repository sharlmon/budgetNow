CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"color" text DEFAULT '#2fa05a' NOT NULL,
	"rate" numeric(6, 3),
	"rev" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "accounts_kind" CHECK ("accounts"."kind" IN ('mobile','bank','paypal','cash','invest','other')),
	CONSTRAINT "accounts_balance" CHECK ("accounts"."balance" >= 0),
	CONSTRAINT "accounts_rate" CHECK ("accounts"."rate" IS NULL OR ("accounts"."rate" >= 0 AND "accounts"."rate" <= 100))
);
