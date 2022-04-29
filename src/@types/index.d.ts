import { firestore } from "firebase-admin";
import Timestamp = firestore.Timestamp;

interface Birthday {
    birthday: Timestamp;
    updatedOn: Timestamp;
}

interface BirthdayGuild {
    birthdayRoleId: string;
    birthdayChannelId: string;
    currentBirthdays: number;
}
