import {
	type AutocompleteProps,
	ButtonKit,
	type SlashCommandProps,
} from "commandkit";
import {
	type APIApplicationCommandOptionChoice,
	ActionRowBuilder,
	ButtonStyle,
	SlashCommandBuilder,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/db";
import { birthdaysTable, serversTable } from "../../db/schema";
import { removeBirthday, runBirthdayCheck } from "../../utils/birthdays";
import { formatReadableDateTime } from "../../utils/dates";
import { requireServer } from "../../utils/servers";

const DEFAULT_TIME_ZONE = "America/New_York";
const BIRTHDAY_PING_KEY = "birthdayPing";
const DAYS_BETWEEN_UPDATES = 365;

const handleSet = async (interaction: SlashCommandProps["interaction"]) => {
	if (!interaction.guild) return;

	const existingBirthday = await db.query.birthdaysTable.findFirst({
		where: and(
			eq(birthdaysTable.serverId, interaction.guild.id),
			eq(birthdaysTable.userId, interaction.user.id),
		),
	});

	if (existingBirthday) {
		const lastUpdated = DateTime.fromJSDate(existingBirthday.updatedOn, {
			zone: "utc",
		});

		const lastUpdatedDiff = lastUpdated.diffNow();

		if (lastUpdatedDiff.days < DAYS_BETWEEN_UPDATES) {
			return interaction.editReply({
				content: `You can't edit your birthday again for about ${
					DAYS_BETWEEN_UPDATES - lastUpdatedDiff.days
				} days`,
			});
		}
	}

	const day = interaction.options.getInteger("day", true);
	const month = interaction.options.getString("month", true);
	const year = interaction.options.getInteger("year", true);
	const timeZone =
		interaction.options.getString("timezone", false) || DEFAULT_TIME_ZONE;

	const birthday = DateTime.fromFormat(
		`${day} ${month} ${year}`,
		"d MMMM yyyy",
		{
			zone: "utc",
		},
	).set({
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
	});

	if (!birthday.isValid) {
		return interaction.editReply({
			content: "Invalid birthday format",
		});
	}

	const updatedBirthday = {
		birthday: birthday.toJSDate(),
		timeZone,
	};

	await db
		.insert(birthdaysTable)
		.values({
			serverId: interaction.guild.id,
			userId: interaction.user.id,
			...updatedBirthday,
		})
		.onConflictDoUpdate({
			target: [birthdaysTable.serverId, birthdaysTable.userId],
			set: updatedBirthday,
		});

	await interaction.editReply({
		content: `Your birthday was set to **${formatReadableDateTime(birthday)}**`,
	});

	await runBirthdayCheck(interaction.client, {
		serverId: interaction.guild.id,
		userId: interaction.user.id,
	});
};

const handleGet = async (interaction: SlashCommandProps["interaction"]) => {
	if (!interaction.guild) return;

	const user = interaction.options.getUser("user", false) || interaction.user;

	const existingBirthday = await db.query.birthdaysTable.findFirst({
		where: and(
			eq(birthdaysTable.serverId, interaction.guild.id),
			eq(birthdaysTable.userId, user.id),
		),
	});

	if (!existingBirthday?.birthday) {
		if (interaction.user.id === user.id) {
			return interaction.editReply({
				content: `You haven't set your birthday yet. Use \`/birthday set\` to set it.`,
			});
		}

		const pingButton = new ButtonKit()
			.setCustomId(BIRTHDAY_PING_KEY)
			.setLabel("Ping them to set it!")
			.setStyle(ButtonStyle.Primary);

		const buttonRow = new ActionRowBuilder<ButtonKit>().addComponents(
			pingButton,
		);

		const buttonMessage = await interaction.editReply({
			content: `${user} hasn't set a birthday yet.`,
			components: [buttonRow],
		});

		pingButton.onClick(
			async (interaction) => {
				await user.send({
					content: `${interaction.user} wants you to add your birthday in **${interaction.guild}**! Use \`/birthday set\` in **${interaction.guild}** to set it.`,
				});

				await interaction.update({
					content: `${user} was pinged to set their birthday!`,
					components: [],
				});
			},
			{
				message: buttonMessage,
				max: 1,
			},
		);
	} else {
		await interaction.editReply({
			content: `${user}'s birthday is on **${formatReadableDateTime(
				DateTime.fromJSDate(existingBirthday.birthday, {
					zone: "utc",
				}),
			)}**`,
		});
	}
};

const handleClear = async (interaction: SlashCommandProps["interaction"]) => {
	if (!interaction.guild) return;

	await db
		.update(birthdaysTable)
		.set({
			birthday: null,
		})
		.where(
			and(
				eq(birthdaysTable.serverId, interaction.guild.id),
				eq(birthdaysTable.userId, interaction.user.id),
			),
		);

	const server = await db.query.serversTable.findFirst({
		where: eq(serversTable.id, interaction.guild.id),
		columns: {
			roleId: true,
		},
	});

	await removeBirthday(
		interaction.client,
		interaction.guild.id,
		interaction.user.id,
		server?.roleId || null,
	);

	return interaction.editReply({
		content: `Your birthday has been deleted from **${interaction.guild}**`,
	});
};

export const run = async ({ interaction }: SlashCommandProps) => {
	if (!interaction.guild) return;
	await interaction.deferReply({ ephemeral: true });

	await requireServer(interaction.guild.id);

	switch (interaction.options.getSubcommand(true)) {
		case "set": {
			await handleSet(interaction);
			break;
		}
		case "get": {
			await handleGet(interaction);
			break;
		}
		case "clear": {
			await handleClear(interaction);
			break;
		}
	}
};

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const getYears = () => {
	const maxYear = DateTime.now().year;
	const minYear = maxYear - 123;

	return Array.apply(null, Array(maxYear - minYear + 1)).map(
		(_, i) => minYear + i,
	);
};

export const autocomplete = ({ interaction }: AutocompleteProps) => {
	const years = getYears().reverse();

	const focusedField = interaction.options.getFocused(true);

	const value = focusedField.value;

	let output: APIApplicationCommandOptionChoice[] = [];

	switch (focusedField.name) {
		case "year": {
			output = years.reduce((acc, curr) => {
				const yearString = curr.toString();
				if (acc.length < 25 && yearString.startsWith(value)) {
					acc.push({
						name: yearString,
						value: curr,
					});
				}

				return acc;
			}, [] as APIApplicationCommandOptionChoice[]);
			break;
		}
		case "timezone": {
			const timeZones = Intl.supportedValuesOf("timeZone");

			output = timeZones.reduce((acc, curr) => {
				if (
					acc.length < 25 &&
					curr.toLowerCase().startsWith(value.toLowerCase())
				) {
					acc.push({
						name: curr,
						value: curr,
					});
				}

				return acc;
			}, [] as APIApplicationCommandOptionChoice[]);
			break;
		}
	}

	interaction.respond(output);
};

export const data = new SlashCommandBuilder()
	.setName("birthday")
	.setDescription("Manage birthdays")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("set")
			.setDescription("Sets your birthday")
			.addIntegerOption((option) =>
				option
					.setName("day")
					.setDescription("Day")
					.setMinValue(1)
					.setMaxValue(31)
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName("month")
					.setDescription("Month")
					.addChoices(
						months.map((m) => ({
							name: m,
							value: m,
						})),
					)
					.setRequired(true),
			)
			.addIntegerOption((option) =>
				option
					.setName("year")
					.setDescription("Year")
					.setRequired(true)
					.setAutocomplete(true),
			)
			.addStringOption((option) =>
				option
					.setName("timezone")
					.setDescription("The time zone you are in (defaults to EST)")
					.setRequired(false)
					.setAutocomplete(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand.setName("clear").setDescription("Clears your birthday"),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("get")
			.setDescription("Gets a user's birthday")
			.addUserOption((option) => option.setName("user").setDescription("User")),
	)
	.setDMPermission(false);
