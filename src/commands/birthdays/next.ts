import type { CommandData, SlashCommandProps } from "commandkit";
import { getSortedBirthdays, hasAtLeastOne } from "../../utils/birthdays";
import { formatReadableDateTime } from "../../utils/dates";

export const run = async ({ interaction }: SlashCommandProps) => {
	if (!interaction.guild) return;

	await interaction.deferReply({ ephemeral: true });

	const birthdays = await getSortedBirthdays(interaction.guild);

	if (!hasAtLeastOne(birthdays)) {
		return interaction.editReply({
			content: "No upcoming birthdays, add yours using `/set`",
		});
	}

	const birthdaysString = birthdays[0].map((b, i) =>
		birthdays[0].length > 1 && i === birthdays[0].length - 1
			? `and ${b.user}'s`
			: b.user,
	);

	return interaction.editReply({
		content: `${
			birthdays[0].length === 2
				? birthdaysString.join(" ")
				: birthdaysString.join(", ")
		} birthday${birthdays[0].length > 1 ? "s are" : " is"} ${
			birthdays[0][0].isToday
				? "today 🎉!"
				: `upcoming on **${formatReadableDateTime(birthdays[0][0].birthday)}**`
		}`,
	});
};

export const data: CommandData = {
	name: "next",
	description: "Show the next upcoming birthday",
};
