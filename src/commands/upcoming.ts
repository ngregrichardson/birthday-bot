import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import format from "date-fns/format";
import { getSortedBirthdays } from "../utils/utils";

const execute = async (interaction: CommandInteraction) => {
    if (!interaction.guild) return;

    const birthdays = await getSortedBirthdays(interaction.guild);

    if (birthdays.length <= 0)
        return await interaction.reply({
            content: `There are no upcoming birthdays.`,
            ephemeral: true,
        });

    const embed = new MessageEmbed().setTitle("Upcoming Birthdays");

    birthdays.forEach((birthday, index) => {
        const user = interaction.guild!.members.cache.get(birthday.userId);
        if (user && index < 25) {
            embed.addField(
                `${index + 1}. ${format(birthday.birthday, "MMMM do, yyyy")}`,
                user.toString()
            );
        }
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
};

export default {
    data: new SlashCommandBuilder()
        .setName("upcoming")
        .setDescription("See a list of the upcoming birthdays."),
    execute,
};
