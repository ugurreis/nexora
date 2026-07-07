CREATE TABLE IF NOT EXISTS "telegram_link_token" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"token" varchar(24) NOT NULL,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"consumedAt" timestamp,
	CONSTRAINT "telegram_link_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "telegram_link_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_link_token" ADD CONSTRAINT "telegram_link_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_token_expires_at_idx" ON "telegram_link_token" USING btree ("expiresAt");