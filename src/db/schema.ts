import { relations } from "drizzle-orm";
import { boolean, date, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const serversTable = pgTable("servers", {
	id: text("id").primaryKey(),
	channelId: text("channel_id"),
	roleId: text("role_id"),
});

export const birthdaysTable = pgTable(
	"birthdays",
	{
		userId: text("user_id").notNull(),
		serverId: text("server_id")
			.notNull()
			.references(() => serversTable.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		birthday: date("birthday", {
			mode: "date",
		}),
		timeZone: text("time_zone")
			.notNull()
			.$default(() => "America/New_York"),
		updatedOn: date("updated_on", {
			mode: "date",
		})
			.notNull()
			.$default(() => new Date())
			.$onUpdate(() => new Date()),
		isBirthday: boolean("is_birthday").notNull().default(false),
		hasTriggered: boolean("has_triggered").notNull().default(false)
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.userId, table.serverId],
		}),
	}),
);

export const serversTableRelations = relations(serversTable, ({ many }) => ({
	birthdays: many(birthdaysTable),
}));

export const birthdaysTableRelations = relations(birthdaysTable, ({ one }) => ({
	server: one(serversTable, {
		fields: [birthdaysTable.serverId],
		references: [serversTable.id],
	}),
}));
