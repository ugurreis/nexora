CREATE TYPE "public"."inbox_source" AS ENUM('manual', 'email');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_item" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"userId" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text,
	"dueDate" timestamp,
	"source" "inbox_source" DEFAULT 'manual' NOT NULL,
	"sourceMeta" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "inbox_item_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "inbox_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "inboxEmailToken" varchar(24);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbox_item" ADD CONSTRAINT "inbox_item_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_item_user_deleted_idx" ON "inbox_item" USING btree ("userId","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_item_user_created_idx" ON "inbox_item" USING btree ("userId","createdAt");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_inboxEmailToken_unique" UNIQUE("inboxEmailToken");