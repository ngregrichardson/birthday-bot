import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {getFirestore} from 'firebase-admin/firestore';

const db = getFirestore();

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if(interaction.guild!.ownerId !== interaction.user.id) return await interaction.reply({ content: "You do not have access to that command.", ephemeral: true });

  if(!channel) return await interaction.reply({ content: "A valid channel is required.", ephemeral: true });

  try {
    await db.collection("guilds").doc(interaction.guild.id).set({birthdayChannelId: channel.id}, {merge: true});

    await interaction.reply({ content: `The birthday channel was set to **${channel}**`, ephemeral: true });
  }catch {
    await interaction.reply({ content: "There was a problem changing the birthday channel." });
  }
};

export default {
  data: new SlashCommandBuilder()
      .setName("setchannel")
      .setDescription("Sets the birthday channel.")
      .addChannelOption(option => option.setName("channel").setDescription("The channel for the bot to send a message in on someone's birthday.").setRequired(true)),
  execute,
};
