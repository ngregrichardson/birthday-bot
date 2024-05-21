CREATE TABLE IF NOT EXISTS "birthdays" (
	"user_id" text NOT NULL,
	"server_id" text NOT NULL,
	"birthday" date NOT NULL,
	"time_zone" text NOT NULL,
	"updated_on" date NOT NULL,
	CONSTRAINT "birthdays_user_id_server_id_pk" PRIMARY KEY("user_id","server_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servers" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"role_id" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthdays" ADD CONSTRAINT "birthdays_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
