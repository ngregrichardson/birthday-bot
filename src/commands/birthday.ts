import { SlashCommandBuilder } from "@discordjs/builders";
import {CommandInteraction, MessageActionRow, MessageButton} from "discord.js";
import {getFirestore} from 'firebase-admin/firestore';
import format from "date-fns/format";
import {Birthday} from "../@types";

const db = getFirestore();

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guildId) return;

  let user = interaction.options.getUser("user");

  if(!user) user = interaction.user;

  try {
    const existingBirthday = await db.collection("guilds").doc(interaction.guildId).collection("birthdays").doc(user.id).get();
    const data = existingBirthday.data() as Birthday;

    await interaction.reply({content: `${user}'s birthday is on **${format(data.birthday.toDate(), "MMMM do, yyyy")}**`, ephemeral: true});
  }catch {
    const buttonRow = [];

    if(user.id !== interaction.user.id) {
      buttonRow.push(new MessageActionRow().addComponents(new MessageButton().setCustomId("birthdayPing").setLabel("Ping them to set it!").setStyle("PRIMARY")));
    }

    await interaction.reply({
      content: `${user} has not set a birthday yet.`,
      ephemeral: true,
      components: buttonRow
    });

    if(user.id !== interaction.user.id && interaction.guild && interaction.channel) {
      const collector = interaction.channel.createMessageComponentCollector({filter: i => i.customId === "birthdayPing" && i.user.id === interaction.user.id, max: 1});

      collector.on("collect", async i => {
        if(i.customId === "birthdayPing") {
          await user!.send({content: `${interaction.user} wants you to add your birthday in **${interaction.guild}**! Use \`/setbirthday\` in **${interaction.guild}** to set it.`});
          await i.update({ content: `${user} was pinged to set their birthday!`, components: [] });
        }
      });
    }
  }
};

export default {
  data: new SlashCommandBuilder()
      .setName("birthday")
      .setDescription("Get a birthday.")
      .addUserOption(option => option.setName("user").setDescription("The user whose birthday to get.")),
  execute,
};
