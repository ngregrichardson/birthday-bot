import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import format from "date-fns/format";
import {getSortedBirthdays} from "../utils/utils";

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guild) return;

  const birthdays = await getSortedBirthdays(interaction.guild);

  if(birthdays.length <= 0) return await interaction.reply({content: `There are no upcoming birthdays.`, ephemeral: true});

  await interaction.reply({content: `${interaction.guild.members.cache.get(birthdays[0].userId)} has the next birthday on on **${format(birthdays[0].birthday, "MMMM do, yyyy")}**`, ephemeral: true});

};

export default {
  data: new SlashCommandBuilder()
      .setName("next")
      .setDescription("See the next birthday."),
  execute,
};
