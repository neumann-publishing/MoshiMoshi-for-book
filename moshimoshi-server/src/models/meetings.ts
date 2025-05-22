import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v4 as uuidv4 } from "uuid";
import * as v from "valibot";
import { db } from "../db/index.js";
import { failedToCreateError, notFoundError } from "../libs/validator.js";
import type { ModelResponse } from "../types.js";

export async function findAllActive() {
	return await db
		.selectFrom("meetings")
		.selectAll("meetings")
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom("users")
					.innerJoin("participants", (join) =>
						join
							.onRef("participants.meetingUuid", "=", "meetings.uuid")
							.onRef("participants.userId", "=", "users.id"),
					)
					.select([
						"users.id as userId",
						"users.name as userName",
						"participants.isOwner as isOwner",
						"participants.producerId as producerId",
						"participants.updatedAt as attendedAt",
					])
					.orderBy("participants.isOwner", "desc"),
			).as("participants"),
		])
		.where("meetings.finishedAt", "is", null)
		.execute();
}

export async function find(uuid: string) {
	return await db
		.selectFrom("meetings")
		.selectAll("meetings")
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom("users")
					.innerJoin("participants", (join) =>
						join
							.on("participants.meetingUuid", "=", uuid)
							.onRef("participants.userId", "=", "users.id"),
					)
					.select([
						"users.id as userId",
						"users.name as userName",
						"participants.producerId as producerId",
						"participants.isOwner as isOwner",
						"participants.updatedAt as attendedAt",
					])
					.orderBy("participants.isOwner", "desc"),
			).as("participants"),
		])
		.where("uuid", "=", uuid)
		.executeTakeFirst();
}

const CreateSchema = v.object({
	name: v.pipe(v.string(), v.maxLength(255)),
	userId: v.number(),
});
type CreateParams = v.InferOutput<typeof CreateSchema>;
export async function create(params: CreateParams): Promise<ModelResponse> {
	const validationResult = v.safeParse(CreateSchema, params);

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	return await db.transaction().execute(async (trx) => {
		const newMeeting = await trx
			.insertInto("meetings")
			.values({
				uuid: uuidv4(),
				name: params.name,
			})
			.returningAll()
			.executeTakeFirst();

		if (!newMeeting) {
			return {
				success: false,
				value: [failedToCreateError("meeting")],
			};
		}

		await trx
			.insertInto("participants")
			.values({
				meetingUuid: newMeeting.uuid,
				userId: params.userId,
				isOwner: true,
			})
			.execute();

		return {
			success: true,
			value: newMeeting,
		};
	});
}

export async function attend(params: {
	uuid: string;
	userId: number;
	producerId: string;
}) {
	return await db.transaction().execute(async (trx) => {
		const existedParticipant = await trx
			.selectFrom("participants")
			.select("userId")
			.where("meetingUuid", "=", params.uuid)
			.where("userId", "=", params.userId)
			.executeTakeFirst();

		if (existedParticipant) {
			await trx
				.updateTable("participants")
				.set({
					producerId: params.producerId,
					updatedAt: new Date(),
				})
				.where("meetingUuid", "=", params.uuid)
				.where("userId", "=", params.userId)
				.execute();
		} else {
			await trx
				.insertInto("participants")
				.values({
					meetingUuid: params.uuid,
					userId: params.userId,
					producerId: params.producerId,
					isOwner: false,
				})
				.execute();
		}

		const participant = await trx
			.selectFrom("participants")
			.innerJoin("users", (join) =>
				join
					.onRef("participants.userId", "=", "users.id")
					.on("participants.meetingUuid", "=", params.uuid),
			)
			.select([
				"participants.userId as userId",
				"participants.meetingUuid as meetingUuid",
				"participants.producerId as producerId",
				"participants.isOwner as isOwner",
				"users.name as userName",
				"participants.updatedAt as attendedAt",
			])
			.where("participants.userId", "=", params.userId)
			.executeTakeFirst();

		return {
			success: true,
			value: { participant, already: existedParticipant != null },
		};
	});
}

const LeaveSchema = v.object({
	uuid: v.pipe(v.string(), v.uuid()),
	userId: v.number(),
});
type LeaveParams = v.InferOutput<typeof LeaveSchema>;
export async function leave(params: LeaveParams) {
	const validationResult = v.safeParse(LeaveSchema, params);

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	return await db.transaction().execute(async (trx) => {
		const participant = await trx
			.selectFrom("participants")
			.where("meetingUuid", "=", params.uuid)
			.where("userId", "=", params.userId)
			.select(["isOwner", "meetingUuid"])
			.executeTakeFirst();

		if (participant == null) {
			return { success: false, value: notFoundError("participant") };
		}

		if (participant.isOwner) {
			await trx
				.updateTable("meetings")
				.set({
					finishedAt: new Date(),
				})
				.where("uuid", "=", participant.meetingUuid)
				.execute();
		}

		await trx
			.deleteFrom("participants")
			.where("meetingUuid", "=", params.uuid)
			.where("userId", "=", params.userId)
			.execute();

		return { success: true, value: { message: "left" } };
	});
}
