import type { Client, Guild, GuildMember } from "discord.js";
import { and, eq, isNotNull } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../db/db";
import { birthdaysTable } from "../db/schema";
import { getGifUrl } from "./tenor";

type Birthday = { user: GuildMember; birthday: DateTime; isToday: boolean };

export const getSortedBirthdays = async (
	guild: Guild,
): Promise<[Birthday, ...Birthday[]][]> => {
	const birthdays = await db.query.birthdaysTable.findMany({
		where: eq(birthdaysTable.serverId, guild.id),
	});

	const reducedBirthdays = await birthdays.reduce<Promise<Birthday[]>>(
		async (acc, { userId, birthday, timeZone }) => {
			const awaitedAcc = await acc;

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

				const user = await guild.members.fetch(userId);

				if (user) {
					awaitedAcc.push({
						user,
						birthday: dateTime,
						isToday,
					});
				}
			}

			return awaitedAcc;
		},
		Promise.resolve([]),
	);

	reducedBirthdays.sort((a, b) => {
		return a.birthday < b.birthday ? -1 : 1;
	});

	const dateKeys = [];

	const dateMap = new Map<string, Birthday[]>();

	for (const b of reducedBirthdays) {
		const key = b.birthday.toFormat("yyyy-MM-dd");
		if (dateMap.has(key)) {
			dateMap.get(key)?.push(b);
		} else {
			dateMap.set(key, [b]);
			dateKeys.push(key);
		}
	}

	return dateKeys.map((k) => dateMap.get(k) as [Birthday, ...Birthday[]]);
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
			const guild = await client.guilds.fetch(serverId);

			const member = await guild?.members?.fetch(userId);

			await member?.roles.remove(roleId);
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

		const guild = await client.guilds.fetch(serverId);

		if (guild) {
			const user = await guild.members.fetch(userId);

			if (user) {
				if (channelId) {
					const channel = await guild.channels.fetch(channelId);

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

export const hasAtLeastOne = <T>(list: readonly T[]): list is [T, ...T[]] => {
	return list.length > 0;
};
