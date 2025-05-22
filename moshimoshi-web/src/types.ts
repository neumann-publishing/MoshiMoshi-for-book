import type { types as mediasoupTypes } from "mediasoup-client";

export type User = {
	id: number;
	email: string;
	name?: string;
};

export type UserSetting = {
	enableVideo: boolean;
	enableMicrophone: boolean;
	enableSpeaker: boolean;
	microphoneUnderGain: number;
	enableNoiseCancellation: boolean;
	currentAudioDeviceId?: string;
	currentVideoDeviceId?: string;
	currentSpeakerDeviceId?: string;
	enableBackgroundBlur: boolean;
};

export type UserWithSettings = User & UserSetting;

export type Meeting = {
	uuid: string;
	name: string;
	finishedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	ownerId: number;
	ownerEmail: string;
	ownerName?: string;
};

export type MeetingWithPariticipants = {
	uuid: string;
	name: string;
	finishedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	rtpCapabilities: mediasoupTypes.RtpCapabilities;
	participants: {
		userId: number;
		userName: string;
		isOwner: boolean;
		producerId?: string;
		attendedAt?: Date;
	}[];
};

export enum TransportDirection {
	SEND = "send",
	RECV = "recv",
}
