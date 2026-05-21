ALTER TABLE "agents" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "model_binding" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "max_concurrency" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "temperature" integer DEFAULT 70;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "max_tokens" integer;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "current_tasks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "last_task_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_binding_api_keys_id_fk" FOREIGN KEY ("model_binding") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;