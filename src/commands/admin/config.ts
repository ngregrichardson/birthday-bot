import type { SlashCommandProps } from "commandkit";
import {
	ChannelType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { birthdaysTable, serversTable } from "../../db/schema";
import { removeBirthday, runBirthdayCheck } from "../../utils/birthdays";

export const run = async ({ interaction, client }: SlashCommandProps) => {
	if (!interaction.guild) return;

	await interaction.deferReply({ ephemeral: true });

	const user = await interaction.guild.members.fetch(client.user.id);

	let config: Partial<typeof serversTable.$inferInsert> = {};

	switch (interaction.options.getSubcommand()) {
		case "role": {
			const role = interaction.options.getRole("role", false);

			if (!role) {
				config = {
					roleId: null,
				};

				break;
			}

			try {
				await user.roles.add(role.id);
				await user.roles.remove(role.id);
			} catch {
				return interaction.editReply({
					content: `I don't have permission to manage ${role}`,
				});
			}

			config = {
				roleId: role.id,
			};

			break;
		}
		case "channel": {
			const channel = interaction.options.getChannel("channel", false);

			if (!channel) {
				config = {
					channelId: null,
				};

				break;
			}

			const fullChannel = await interaction.guild.channels.fetch(channel.id);

			if (
				!fullChannel ||
				!fullChannel.permissionsFor(user).has("ViewChannel") ||
				!fullChannel.permissionsFor(user).has("SendMessages", true) ||
				!fullChannel.permissionsFor(user).has("EmbedLinks", true)
			) {
				return interaction.editReply({
					content: `I don't have viewing, sending, or embedding links permissions for ${channel}`,
				});
			}

			config = {
				channelId: channel.id,
			};

			break;
		}
		case "reset": {
			const confirm = interaction.options.getBoolean("confirm", true);

			if (!confirm) {
				return interaction.editReply({
					content: `You must set \`confirm\` to \`True\` to confirm that you want to reset all ${client.user} data`,
				});
			}

			const activeBirthdays = await db.query.birthdaysTable.findMany({
				columns: {
					userId: true,
				},
				where: and(
					eq(birthdaysTable.serverId, interaction.guild.id),
					eq(birthdaysTable.isBirthday, true),
				),
				with: {
					server: {
						columns: {
							roleId: true,
						},
					},
				},
			});

			for (const birthday of activeBirthdays) {
				removeBirthday(
					client,
					interaction.guild.id,
					birthday.userId,
					birthday.server.roleId,
				);
			}

			await db
				.delete(serversTable)
				.where(eq(serversTable.id, interaction.guild.id));

			return interaction.editReply({
				content: `${client.user} has been fully reset`,
			});
		}
	}

	try {
		await db
			.insert(serversTable)
			.values({
				id: interaction.guild.id,
				...config,
			})
			.onConflictDoUpdate({
				target: serversTable.id,
				set: config,
			});
	} catch (e) {
		console.error(e);

		return interaction.editReply({
			content: "An error occurred while updating the configuration",
		});
	}

	return interaction.editReply({
		content: "Configuration updated successfully",
	});
};

export const data = new SlashCommandBuilder()
	.setName("config")
	.setDescription("Updates Birthday Bot configurations")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("role")
			.setDescription("Sets the role to be given to users on their birthday")
			.addRoleOption((option) =>
				option
					.setName("role")
					.setDescription("The role to be given to users on their birthday"),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("channel")
			.setDescription("Sets the channel to send birthday messages in")
			.addChannelOption((option) =>
				option
					.setName("channel")
					.setDescription("The channel to send birthday messages in")
					.addChannelTypes(
						ChannelType.GuildText,
						ChannelType.AnnouncementThread,
						ChannelType.GuildAnnouncement,
						ChannelType.PrivateThread,
						ChannelType.PublicThread,
					),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("reset")
			.setDescription("Resets Birthday Bot's configuration for this server")
			.addBooleanOption((option) =>
				option
					.setName("confirm")
					.setDescription(
						"Confirms that all configuration data and all birthdays will be cleared and reset to defaults",
					)
					.setRequired(true),
			),
	)
	.setDMPermission(false)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
