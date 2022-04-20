import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {getFirestore} from 'firebase-admin/firestore';

const db = getFirestore();

const execute = async (interaction: CommandInteraction) => {
  if(!interaction.guild) return;

  const role = interaction.options.getRole("role");

  if(interaction.guild!.ownerId !== interaction.user.id) return await interaction.reply({ content: "You do not have access to that command.", ephemeral: true });

  if(!role) return await interaction.reply({ content: "A valid role is required.", ephemeral: true });

  try {
    await db.collection("guilds").doc(interaction.guild.id).set({birthdayRoleId: role.id}, {merge: true});

    await interaction.reply({ content: `The birthday role was set to **${role}**`, ephemeral: true });
  }catch {
    await interaction.reply({ content: "There was a problem changing the birthday role." });
  }
};

export default {
  data: new SlashCommandBuilder()
      .setName("setrole")
      .setDescription("Sets the birthday role.")
      .addRoleOption(option => option.setName("role").setDescription("The role to give a user on their birthday.").setRequired(true)),
  execute,
};
