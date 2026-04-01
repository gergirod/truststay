CREATE TABLE "stay_fit_narrative_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"purpose" text NOT NULL,
	"work_style" text NOT NULL,
	"daily_balance" text DEFAULT 'balanced' NOT NULL,
	"payload" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "stay_fit_narrative_cache_city_intent_unique" ON "stay_fit_narrative_cache" USING btree ("city_slug","purpose","work_style","daily_balance");--> statement-breakpoint
CREATE INDEX "stay_fit_narrative_cache_city_idx" ON "stay_fit_narrative_cache" USING btree ("city_slug");
