import {config} from "dotenv";
import "isomorphic-fetch";
import {Client, Collection, Command, Intents} from "discord.js";
import registerCommands from "./utils/registerCommands";
import registerEvents from "./utils/registerEvents";
import {initializeFirebase, runBirthdayCheck} from "./utils/utils";
import {CronJob} from "cron";

/**
 * Initialize environment files
 */
config();

// Firebase
initializeFirebase();

/**
 * Initialize Discord client
 */
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGES
  ],
});
client.commands = new Collection<unknown, Command>();

client.once("ready", () => {
  console.log("Bot online.");

  if (process.env.IS_PROD) {
    client.guilds.fetch().then((guilds) => {
      guilds.forEach((guild) => {
        guild.fetch().then((g) => g.commands.set([]));
      });
    });
  }

  registerCommands(client);

  registerEvents(client);

  const job = new CronJob('0 0 0 * * *', async () => {
    await runBirthdayCheck(client);
  });

  job.start();
});

client.login(process.env.BOT_TOKEN);
