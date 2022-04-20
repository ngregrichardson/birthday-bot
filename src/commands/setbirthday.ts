import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import {getFirestore} from 'firebase-admin/firestore';
import {firestore} from "firebase-admin";
import Timestamp = firestore.Timestamp;
import differenceInDays from "date-fns/differenceInDays";
import isValid from "date-fns/isValid";
import parse from "date-fns/parse";
import startOfDay from "date-fns/startOfDay";
import format from "date-fns/format";
import {Birthday} from "../@types";
import {runBirthdayCheck} from "../utils/utils";

const db = getFirestore();
const daysUntilUpdatable = 365;

const endingYear = new Date().getFullYear() - 13;
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = Array.from({length: 25}, (_, i) => endingYear - i);

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guildId) return;

  const day = interaction.options.getInteger("day");
  const month = interaction.options.getString("month");
  const year = interaction.options.getInteger("year");

  try {
    const birthDate = parse(`${day} ${month} ${year}`, "d MMMM yyyy", startOfDay(new Date()));

    if(!birthDate || !isValid(birthDate)) throw new Error("Invalid date trying to set birthday.");

    let existingBirthday;
    try {
      existingBirthday = await db.collection("guilds").doc(interaction.guildId).collection("birthdays").doc(interaction.user.id).get();
    }catch {
      // Not found
    }

    if(existingBirthday && existingBirthday.exists) {
      const data = existingBirthday.data() as Birthday;

      const dayDifference = differenceInDays(Date.now(), data.updatedOn.toDate());
      if(dayDifference <= daysUntilUpdatable) {
        return await interaction.reply({ content: `You cannot update your birthday for another ${daysUntilUpdatable - dayDifference} days`, ephemeral: true });
      }
    }
    await db.collection("guilds").doc(interaction.guildId).collection("birthdays").doc(interaction.user.id).set({birthday: Timestamp.fromDate(birthDate), updatedOn: Timestamp.now()}, {merge: true});

    await interaction.reply({ content: `Your birthday has been set to **${format(birthDate, "MMMM do yyyy")}**. You can update your birthday again in 365 days.`, ephemeral: true });

    await runBirthdayCheck(interaction.client);
  }catch(e) {
    console.error(e);
    await interaction.reply({ content: "Sorry, that looks like an invalid date. Please try again.", ephemeral: true });
  }
};

export default {
  data: new SlashCommandBuilder()
      .setName("setbirthday")
      .setDescription("Set your birthday so the server will know!")
      .addStringOption(option => option.setName("month").setDescription("Month").addChoices(months.map(m => [m, m])).setRequired(true))
      .addIntegerOption(option => option.setName("day").setDescription("Day").setMinValue(1).setMaxValue(31).setRequired(true))
      .addIntegerOption(option => option.setName("year").setDescription("Year").addChoices(years.map(y => [`${y}`, y])).setRequired(true)),
  execute,
};
