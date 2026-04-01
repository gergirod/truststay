CREATE TABLE "user_stay_setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"city_slug" text NOT NULL,
	"purpose" text NOT NULL,
	"work_style" text NOT NULL,
	"daily_balance" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "city_last_enriched_setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"purpose" text NOT NULL,
	"work_style" text NOT NULL,
	"daily_balance" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "email_stay_setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_normalized" text NOT NULL,
	"city_slug" text NOT NULL,
	"purpose" text NOT NULL,
	"work_style" text NOT NULL,
	"daily_balance" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "user_stay_setups_user_city_unique" ON "user_stay_setups" USING btree ("user_id","city_slug");--> statement-breakpoint
CREATE INDEX "user_stay_setups_city_idx" ON "user_stay_setups" USING btree ("city_slug");--> statement-breakpoint
CREATE INDEX "user_stay_setups_updated_at_idx" ON "user_stay_setups" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "city_last_enriched_setups_city_unique" ON "city_last_enriched_setups" USING btree ("city_slug");--> statement-breakpoint
CREATE INDEX "city_last_enriched_setups_updated_at_idx" ON "city_last_enriched_setups" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_stay_setups_email_city_unique" ON "email_stay_setups" USING btree ("email_normalized","city_slug");--> statement-breakpoint
CREATE INDEX "email_stay_setups_city_idx" ON "email_stay_setups" USING btree ("city_slug");--> statement-breakpoint
CREATE INDEX "email_stay_setups_updated_at_idx" ON "email_stay_setups" USING btree ("updated_at");
