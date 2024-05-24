import type { CommandData, SlashCommandProps } from "commandkit";
import { getSortedBirthdays } from "../../utils/birthdays";
import { formatReadableDateTime } from "../../utils/dates";

export const run = async ({ interaction }: SlashCommandProps) => {
	if (!interaction.guild) return;

	await interaction.deferReply({ ephemeral: true });

	const birthdays = await getSortedBirthdays(interaction.guild);

	if (birthdays.length <= 0 || !birthdays[0]) {
		return interaction.editReply({
			content: "No upcoming birthdays, add yours using `/set`",
		});
	}

	return interaction.editReply({
		content: `${birthdays[0]?.user}'s birthday is ${
			birthdays[0]?.isToday
				? "today 🎉!"
				: `upcoming on **${formatReadableDateTime(birthdays[0]?.birthday)}**`
		}`,
	});
};

export const data: CommandData = {
	name: "next",
	description: "Show the next upcoming birthday",
};
