import * as v from "valibot";
import { db } from "../db/index.js";

enum Target {
	Video = "video",
	Microphone = "microphone",
	Speaker = "speaker",
}

const UpdateEnableSchema = v.object({
	userId: v.number(),
	target: v.enum(Target),
	enable: v.boolean(),
});
type UpdateEnableParams = v.InferOutput<typeof UpdateEnableSchema>;
export async function updateEnable({
	userId,
	target,
	enable,
}: UpdateEnableParams) {
	const validationResult = v.safeParse(UpdateEnableSchema, {
		userId,
		target,
		enable,
	});

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	const targetColumn = `enable_${target}`;

	const userSetting = await db
		.updateTable("userSettings")
		.set({
			[targetColumn]: enable,
			updatedAt: new Date(),
		})
		.where("userId", "=", userId)
		.returningAll()
		.executeTakeFirst();

	return { success: true, value: userSetting };
}

const UpdateSchema = v.object({
	userId: v.number(),
	microphoneUnderGain: v.optional(v.number()),
	enableNoiseCancellation: v.optional(v.boolean()),
	currentAudioDeviceId: v.optional(v.pipe(v.string(), v.maxLength(255))),
	currentVideoDeviceId: v.optional(v.pipe(v.string(), v.maxLength(255))),
	currentSpeakerDeviceId: v.optional(v.pipe(v.string(), v.maxLength(255))),
	enableBackgroundBlur: v.optional(v.boolean()),
});
type UpdateParams = v.InferOutput<typeof UpdateSchema>;
export async function update({
	userId,
	microphoneUnderGain,
	enableNoiseCancellation,
	currentAudioDeviceId,
	currentVideoDeviceId,
	currentSpeakerDeviceId,
	enableBackgroundBlur,
}: UpdateParams) {
	const validationResult = v.safeParse(UpdateSchema, {
		userId,
		microphoneUnderGain,
		enableNoiseCancellation,
		currentAudioDeviceId,
		currentVideoDeviceId,
		currentSpeakerDeviceId,
		enableBackgroundBlur,
	});

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	const userSetting = await db
		.updateTable("userSettings")
		.set({
			microphoneUnderGain: microphoneUnderGain ?? undefined,
			enableNoiseCancellation: enableNoiseCancellation ?? undefined,
			currentAudioDeviceId: currentAudioDeviceId ?? undefined,
			currentVideoDeviceId: currentVideoDeviceId ?? undefined,
			currentSpeakerDeviceId: currentSpeakerDeviceId ?? undefined,
			enableBackgroundBlur: enableBackgroundBlur ?? undefined,
			updatedAt: new Date(),
		})
		.where("userId", "=", userId)
		.returningAll()
		.executeTakeFirst();

	return { success: true, value: userSetting };
}

export async function find(userId: number) {
	return await db
		.selectFrom("userSettings")
		.selectAll()
		.where("userId", "=", userId)
		.executeTakeFirst();
}
