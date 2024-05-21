import postgres from "postgres";
import invariant from "tiny-invariant";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";

invariant(process.env.DATABASE_URL, "DATABASE_URL must be defined");

const queryClient = postgres(process.env.DATABASE_URL);

export const db = drizzle(queryClient, {
	schema,
});
