import {cert, initializeApp} from "firebase-admin/app";
import {Client, Guild, TextChannel} from "discord.js";
import {Birthday, BirthdayGuild} from "../@types";
import isToday from "date-fns/isToday";
import {getGifUrl} from "./tenor";
import {getFirestore} from "firebase-admin/firestore";
import isBefore from "date-fns/isBefore";
import startOfDay from "date-fns/startOfDay";

let db: FirebaseFirestore.Firestore;

export const formatEnvironmentVariable = (variable: string): string => {
    let output = variable.trim().replaceAll("\\n", "\n");
    const firstCharacter = output.charAt(0);
    const lastCharacter = output.charAt(output.length - 1);
    if (firstCharacter === "'" || firstCharacter === '"') {
        output = output.substring(1);
    }

    if (lastCharacter === "'" || lastCharacter === '"') {
        output = output.slice(0, -1);
    }

    return output;
};

export const initializeFirebase = () => {
    initializeApp({
        credential: cert({
            projectId: formatEnvironmentVariable(process.env.FIREBASE_PROJECT_ID as string),
            privateKey: formatEnvironmentVariable(process.env.FIREBASE_PRIVATE_KEY as string),
            clientEmail: formatEnvironmentVariable(process.env.FIREBASE_CLIENT_EMAIL as string),
        }),
    });

    db = getFirestore();
};

export const runBirthdayCheck = async (client: Client) => {
    if(db) {
        const guildCollection = await db.collection("guilds").get();
        for (const guildDoc of guildCollection.docs) {
            const guildData = guildDoc.data() as BirthdayGuild;

            const birthdaysCollection = await db.collection("guilds").doc(guildDoc.id).collection("birthdays").get();

            for (const birthdayDoc of birthdaysCollection.docs) {
                const birthdayData = birthdayDoc.data() as Birthday;

                const birthDate = birthdayData.birthday.toDate();
                birthDate.setFullYear(new Date().getFullYear());

                const guild = await client.guilds.fetch(guildDoc.id);
                const user = await guild.members.fetch(birthdayDoc.id);

                if(user) {
                    const canChangeRole = guildData.birthdayRoleId && guild.roles.cache.get(guildData.birthdayRoleId);
                    if(isToday(birthDate)) {
                        if(canChangeRole && !user.roles.cache.get(guildData.birthdayRoleId)) {
                            await user.roles.add(guildData.birthdayRoleId);
                        }

                        if(guildData.birthdayChannelId) {
                            const channel = guild.channels.cache.get(guildData.birthdayChannelId) as TextChannel;

                            if(channel) {
                                await channel.send({ content: `Happy birthday ${user}! 🎉🎂🎆 ${await getGifUrl("birthday")}` });
                            }
                        }
                    }else {
                        if(canChangeRole && user.roles.cache.get(guildData.birthdayRoleId)) {
                            await user.roles.remove(guildData.birthdayRoleId);
                        }
                    }
                }
            }
        }
    }
};

export const getSortedBirthdays = async (guild: Guild) => {
    const birthdaysCollections = await db.collection("guilds").doc(guild.id).collection("birthdays").get();

    let filteredBirthdays: {userId: string, birthday: Date}[] = [];

    birthdaysCollections.docs.forEach((birthdayDoc) => {
        const date = birthdayDoc.data().birthday.toDate();
        date.setFullYear(new Date().getFullYear());

        if(isBefore(startOfDay(date), startOfDay(new Date()))) {
            date.setFullYear((new Date().getFullYear()) + 1);
        }

        filteredBirthdays.push({userId: birthdayDoc.id, birthday: date});
    });

    filteredBirthdays.sort((a, b) => {
        return a.birthday < b.birthday ? -1 : 1;
    });

    for(let i = filteredBirthdays.length - 1; i >= 0; i--) {
        const birthday = filteredBirthdays[i];

        const user = await guild.members.fetch(birthday.userId);

        if(!user) filteredBirthdays = filteredBirthdays.splice(i, 1);
    }

    return filteredBirthdays;
}
