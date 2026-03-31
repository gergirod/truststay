CREATE TABLE "unlock_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"product" text NOT NULL,
	"city_slug" text NOT NULL,
	"bundle_city_slug" text,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlock_restore_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_normalized" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unlock_entitlements_session_unique" ON "unlock_entitlements" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "unlock_entitlements_email_idx" ON "unlock_entitlements" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "unlock_entitlements_city_idx" ON "unlock_entitlements" USING btree ("city_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "unlock_restore_tokens_hash_unique" ON "unlock_restore_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "unlock_restore_tokens_email_idx" ON "unlock_restore_tokens" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "unlock_restore_tokens_expires_idx" ON "unlock_restore_tokens" USING btree ("expires_at");