import "dotenv/config";

import { CommandKit } from "commandkit";
import { Client, IntentsBitField, Partials } from "discord.js";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Cron from "croner";
import { applyMigrations } from "./db/migrate";
import { runBirthdayCheck } from "./utils/birthdays";

applyMigrations().then(async () => {
	const __dirname = dirname(fileURLToPath(import.meta.url));

	const client = new Client({
		intents: [
			IntentsBitField.Flags.Guilds,
			IntentsBitField.Flags.GuildMessages,
			IntentsBitField.Flags.GuildMessageReactions,
		],
		partials: [Partials.Channel],
	});

	new CommandKit({
		client,
		eventsPath: join(__dirname, "events"),
		commandsPath: join(__dirname, "commands"),
	});

	await client.login(process.env.DISCORD_TOKEN);

	Cron("*/5 * * * * *", () => runBirthdayCheck(client as Client<true>), {});
});
