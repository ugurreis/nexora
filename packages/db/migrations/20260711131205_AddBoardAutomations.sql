CREATE TYPE "public"."automation_action_type" AS ENUM('card.add_label', 'card.assign_member');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('card.moved_to_list');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "board_automations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"boardId" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"triggerType" "automation_trigger_type" NOT NULL,
	"triggerListId" bigint NOT NULL,
	"actionType" "automation_action_type" NOT NULL,
	"actionLabelId" bigint,
	"actionWorkspaceMemberId" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "board_automations_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "board_automations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_automations" ADD CONSTRAINT "board_automations_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_automations" ADD CONSTRAINT "board_automations_triggerListId_list_id_fk" FOREIGN KEY ("triggerListId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_automations" ADD CONSTRAINT "board_automations_actionLabelId_label_id_fk" FOREIGN KEY ("actionLabelId") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_automations" ADD CONSTRAINT "board_automations_actionWorkspaceMemberId_workspace_members_id_fk" FOREIGN KEY ("actionWorkspaceMemberId") REFERENCES "public"."workspace_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_automations" ADD CONSTRAINT "board_automations_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_automations_board_trigger_idx" ON "board_automations" USING btree ("boardId","triggerListId");