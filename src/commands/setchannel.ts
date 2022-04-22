import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {getFirestore} from 'firebase-admin/firestore';

const db = getFirestore();

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if(interaction.guild!.ownerId !== interaction.user.id) return await interaction.reply({ content: "You do not have access to that command.", ephemeral: true });

  if(!channel) return await interaction.reply({ content: "A valid channel is required.", ephemeral: true });

  const botUser = await interaction.guild.members.fetch(interaction.client.user!.id);

  const permissionChannel = await interaction.guild.channels.fetch(channel.id);

  if(!permissionChannel || !permissionChannel.permissionsFor(botUser).has("SEND_MESSAGES", true) || !permissionChannel.permissionsFor(botUser).has("VIEW_CHANNEL", true) || !permissionChannel.permissionsFor(botUser).has("EMBED_LINKS", true)) {
    return await interaction.reply({ content: `The channel could not be set because \`Birthday Bot\` does not have permissions to view and send messages and embed links in ${channel}.`, ephemeral: true });
  }

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
