import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import invariant from "tiny-invariant";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";

export const applyMigrations = async () => {
	invariant(process.env.DATABASE_URL, "DATABASE_URL must be defined");

	const queryClient = postgres(process.env.DATABASE_URL, {
		max: 1,
	});

	const db = drizzle(queryClient, {
		schema,
	});

	await migrate(db, { migrationsFolder: "migrations" });

	await queryClient.end();
};
