CREATE TABLE IF NOT EXISTS "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch_id" varchar(100) NOT NULL,
	"model" varchar(50) NOT NULL,
	"prompt" text NOT NULL,
	"system_prompt" text,
	"aspect_ratio" varchar(20) DEFAULT '1:1',
	"resolution" varchar(10) DEFAULT '1K',
	"temperature" integer,
	"top_p" integer,
	"top_k" integer,
	"reference_images" json DEFAULT '[]',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"result_url" text,
	"result_data" json,
	"external_task_id" text,
	"credit_cost" integer NOT NULL,
	"error" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "generations_user_id_idx" ON "generations" ("user_id");
--> statement-breakpoint
CREATE INDEX "generations_batch_id_idx" ON "generations" ("batch_id");
--> statement-breakpoint
CREATE INDEX "generations_external_task_id_idx" ON "generations" ("external_task_id");
