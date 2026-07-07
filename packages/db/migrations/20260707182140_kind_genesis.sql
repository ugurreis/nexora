CREATE TABLE IF NOT EXISTS "telegram_link" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"userId" uuid NOT NULL,
	"telegramChatId" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_link_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "telegram_link_userId_unique" UNIQUE("userId"),
	CONSTRAINT "telegram_link_telegramChatId_unique" UNIQUE("telegramChatId")
);
--> statement-breakpoint
ALTER TABLE "telegram_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_pending_task_batch" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"userId" uuid NOT NULL,
	"payload" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"consumedAt" timestamp,
	CONSTRAINT "telegram_pending_task_batch_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "telegram_pending_task_batch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_link" ADD CONSTRAINT "telegram_link_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_pending_task_batch" ADD CONSTRAINT "telegram_pending_task_batch_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
