import { db } from "../db/db";
import { serversTable } from "../db/schema";

export const requireServer = (guildId: string) => {
	return db
		.insert(serversTable)
		.values({
			id: guildId,
		})
		.onConflictDoNothing();
};
