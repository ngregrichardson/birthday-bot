import { defineConfig } from "drizzle-kit";
import invariant from "tiny-invariant";

invariant(process.env.DATABASE_URL, 'DATABASE_URL must be defined');

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './migrations',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    }
})