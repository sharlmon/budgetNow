CREATE TABLE "push_subscriptions" (
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"time_zone" text NOT NULL,
	"days_before" integer DEFAULT 1 NOT NULL,
	"detail" text DEFAULT 'names' NOT NULL,
	"last_sent_on" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_user_id_endpoint_pk" PRIMARY KEY("user_id","endpoint"),
	CONSTRAINT "push_days_before" CHECK ("push_subscriptions"."days_before" BETWEEN 0 AND 7),
	CONSTRAINT "push_detail" CHECK ("push_subscriptions"."detail" IN ('basic','names','full'))
);
