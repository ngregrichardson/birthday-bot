import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

const execute = async (interaction: CommandInteraction) => {
    if (!interaction.guild) return;

    const role = interaction.options.getRole("role");

    if (!role)
        return await interaction.reply({
            content: "A valid role is required.",
            ephemeral: true,
        });

    try {
        const botUser = await interaction.guild.members.fetch(
            interaction.client.user!.id
        );

        await botUser.roles.add(role.id);
        await botUser.roles.remove(role.id);
    } catch {
        return await interaction.reply({
            content: `The role could not be set because the \`Birthday Bot\` role is below ${role}.`,
            ephemeral: true,
        });
    }

    try {
        await db
            .collection("guilds")
            .doc(interaction.guild.id)
            .set({ birthdayRoleId: role.id }, { merge: true });

        await interaction.reply({
            content: `The birthday role was set to **${role}**.`,
            ephemeral: true,
        });
    } catch {
        await interaction.reply({
            content: "There was a problem changing the birthday role.",
        });
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName("setrole")
        .setDescription("Sets the birthday role.")
        .addRoleOption((option) =>
            option
                .setName("role")
                .setDescription("The role to give a user on their birthday.")
                .setRequired(true)
        ),
    execute,
};
