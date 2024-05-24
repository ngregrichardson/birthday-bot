import type { Client, Guild, GuildMember } from "discord.js";
import { and, eq, isNotNull } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../db/db";
import { birthdaysTable } from "../db/schema";
import { getGifUrl } from "./tenor";

export const getSortedBirthdays = async (guild: Guild) => {
	const birthdays = await db.query.birthdaysTable.findMany({
		where: eq(birthdaysTable.serverId, guild.id),
	});

	return birthdays
		.reduce(
			(acc, { userId, birthday, timeZone }) => {
				if (birthday) {
					let dateTime = DateTime.fromJSDate(birthday, {
						zone: "utc",
					})
						.set({ year: DateTime.now().year })
						.setZone(timeZone, {
							keepLocalTime: true,
						});

					let isToday = false;

					if (dateTime < DateTime.now()) {
						if (DateTime.now() < dateTime.plus({ day: 1 })) {
							isToday = true;
						} else {
							dateTime = dateTime.plus({ year: 1 });
						}
					}

					const user = guild.members.cache.find((m) => m.id === userId);

					if (user) {
						acc.push({
							user,
							birthday: dateTime,
							isToday,
						});
					}
				}

				return acc;
			},
			[] as { user: GuildMember; birthday: DateTime; isToday: boolean }[],
		)
		.sort((a, b) => {
			return a.birthday < b.birthday ? -1 : 1;
		});
};

export const removeBirthday = async (
	client: Client<true>,
	serverId: string,
	userId: string,
	roleId: string | null,
) => {
	try {
		await db.update(birthdaysTable).set({
			isBirthday: false,
		});

		if (roleId) {
			await client.guilds.cache
				.get(serverId)
				?.members.cache.get(userId)
				?.roles.remove(roleId);
		}
	} catch (e) {
		console.error(e);
	}
};

const triggerBirthday = async (
	client: Client<true>,
	serverId: string,
	userId: string,
	channelId: string | null,
	roleId: string | null,
) => {
	try {
		await db.update(birthdaysTable).set({
			isBirthday: true,
		});

		const guild =
			client.guilds.cache.get(serverId) ||
			(await client.guilds.fetch(serverId));

		if (guild) {
			const user =
				guild.members.cache.get(userId) || (await guild.members.fetch(userId));

			if (user) {
				if (channelId) {
					const channel =
						guild.channels.cache.get(channelId) ||
						(await guild.channels.fetch(channelId));

					if (channel?.isTextBased()) {
						await channel.send({
							content: `Happy birthday ${user}! 🎉🎂🎆 ${await getGifUrl(
								"birthday",
							)}`,
						});
					}
				}

				if (roleId) {
					await user.roles.add(roleId);
				}
			}
		}
	} catch (e) {
		console.error(e);
	}
};

export const runBirthdayCheck = async (
	client: Client<true>,
	customCheck?: { serverId: string; userId?: string },
) => {
	const birthdays = await db.query.birthdaysTable.findMany({
		where: and(
			isNotNull(birthdaysTable.birthday),
			customCheck
				? and(
						eq(birthdaysTable.serverId, customCheck.serverId),
						customCheck.userId
							? eq(birthdaysTable.userId, customCheck.userId)
							: undefined,
					)
				: undefined,
		),
		with: {
			server: {
				columns: {
					channelId: true,
					roleId: true,
				},
			},
		},
	});

	for (const {
		serverId,
		userId,
		birthday,
		timeZone,
		server,
		isBirthday,
	} of birthdays) {
		if (birthday) {
			const realBirthday = DateTime.fromJSDate(birthday, {
				zone: "utc",
			})
				.set({ year: DateTime.now().year })
				.setZone(timeZone, {
					keepLocalTime: true,
				});

			const nextDay = realBirthday.plus({ day: 1 });

			if (isBirthday) {
				if (DateTime.now() > nextDay) {
					removeBirthday(client, serverId, userId, server.roleId);
				}
			} else {
				if (realBirthday <= DateTime.now() && DateTime.now() <= nextDay) {
					triggerBirthday(
						client,
						serverId,
						userId,
						server.channelId,
						server.roleId,
					);
				}
			}
		}
	}
};
