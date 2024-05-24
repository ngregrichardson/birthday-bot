ALTER TABLE "birthdays" DROP CONSTRAINT "birthdays_server_id_servers_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "birthdays" ADD CONSTRAINT "birthdays_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "birthdays" ALTER COLUMN "birthday" DROP NOT NULL;