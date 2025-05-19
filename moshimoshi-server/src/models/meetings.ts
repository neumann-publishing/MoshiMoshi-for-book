import { Insertable } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v4 as uuidv4 } from "uuid";
import * as v from "valibot";
import { Meetings } from "../db/db.js";
import { db } from "../db/index.js";
import { failedToCreateError, notFoundError } from "../libs/validator.js";
import { ModelResponse } from "../types.js";

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
						"users.id as user_id",
						"users.email as user_email",
						"users.name as user_name",
						"participants.isOwner as is_owner",
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
						"users.id as user_id",
						"users.email as user_email",
						"users.name as user_name",
						"participants.isOwner as is_owner",
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
export async function create(
	params: CreateParams,
): Promise<ModelResponse<Insertable<Meetings>>> {
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

const AttendSchema = v.object({
	uuid: v.pipe(v.string(), v.uuid()),
	userId: v.number(),
});
type AttendParams = v.InferOutput<typeof AttendSchema>;
export async function attend(params: AttendParams) {
	const validationResult = v.safeParse(AttendSchema, params);

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	return await db.transaction().execute(async (trx) => {
		const existedParticipant = await trx
			.selectFrom("participants")
			.selectAll()
			.where("meetingUuid", "=", params.uuid)
			.where("userId", "=", params.userId)
			.executeTakeFirst();

		if (existedParticipant) {
			return {
				success: true,
				value: { message: "Already attended", already: true },
			};
		}

		await trx
			.insertInto("participants")
			.values({
				meetingUuid: params.uuid,
				userId: params.userId,
				isOwner: false,
			})
			.execute();

		return { success: true, value: { message: "attended", already: false } };
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
