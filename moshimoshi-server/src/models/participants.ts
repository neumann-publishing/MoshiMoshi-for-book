import { db } from "../db/index.js";

export async function update({
	userId,
	meetingUuid,
	producerId,
}: {
	userId: number;
	meetingUuid: string;
	producerId: string;
}) {
	return await db
		.updateTable("participants")
		.set({ producerId, updatedAt: new Date() })
		.where("userId", "=", userId)
		.where("meetingUuid", "=", meetingUuid)
		.execute();
}

export async function findProducerIds(meetingUuid: string) {
	const participants = await db
		.selectFrom("participants")
		.select(["userId", "producerId"])
		.where("meetingUuid", "=", meetingUuid)
		.where("producerId", "is not", null)
		.execute();
	return participants;
}

export async function getParticipantsByMeetingUuid(meetingUuid: string) {
	const participants = await db
		.selectFrom("participants")
		.innerJoin("users", "users.id", "participants.userId")
		.select([
			"participants.userId",
			"users.name as userName",
			"participants.producerId",
			"participants.isOwner",
			"participants.updatedAt as attendedAt",
		])
		.where("participants.meetingUuid", "=", meetingUuid)
		.execute();
	return participants;
}
