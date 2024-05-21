import type { CommandData, SlashCommandProps } from "commandkit";
import { EmbedBuilder } from "discord.js";
import { getSortedBirthdays } from "../../utils/birthdays";
import { formatReadableDateTime } from "../../utils/dates";

export const run = async ({ interaction }: SlashCommandProps) => {
	if (!interaction.guild) return;

	await interaction.deferReply({ ephemeral: true });

	const birthdays = await getSortedBirthdays(interaction.guild);

	if (birthdays.length <= 0) {
		return interaction.editReply({
			content: "No upcoming birthdays, add yours using `/set`",
		});
	}

	const embed = new EmbedBuilder().setTitle("Upcoming Birthdays").addFields(
		...birthdays.slice(0, 25).map(({ birthday, user }, i) => ({
			name: `${i + 1}. ${formatReadableDateTime(birthday)}`,
			value: user.toString(),
		})),
	);

	await interaction.editReply({
		embeds: [embed],
	});
};

export const data: CommandData = {
	name: "upcoming",
	description: "List upcoming birthdays",
};
