import type { types as mediasoupTypes } from "mediasoup-client";
import type { Socket } from "socket.io-client";

// Transport parameters returned from createWebRtcTransport
export type TransportParameters = {
	id: string;
	iceParameters: mediasoupTypes.IceParameters;
	iceCandidates: mediasoupTypes.IceCandidate[];
	dtlsParameters: mediasoupTypes.DtlsParameters;
	error?: string;
};

// Response from produce event
export type ProduceResponse = {
	producerId: string;
	error?: string;
};

// Response from consume event
export type ConsumeResponse = {
	id: string;
	producerId: string;
	kind: mediasoupTypes.MediaKind;
	rtpParameters: mediasoupTypes.RtpParameters;
	userId: string | number;
	error?: string;
};

// Participant info structure
export type ParticipantInfo = {
	userId: number;
	meetingUuid: string;
	producerId: string | null;
	isOwner: boolean;
	userName: string;
	attendedAt: Date | null;
};

// Strongly typed Socket interface with mediasoup events
export type MediasoupSocket = Omit<Socket, "emit"> & {
	emit: Socket["emit"] & {
		(
			event: "getRouterRtpCapabilities",
			callback: (rtpCapabilities: mediasoupTypes.RtpCapabilities) => void,
		): MediasoupSocket;

		(
			event: "createWebRtcTransport",
			data: { direction: "send" | "recv" },
			callback: (params: TransportParameters) => void,
		): MediasoupSocket;
		
		(
			event: "getParticipants",
			data: { meetingUuid: string },
			callback: (participants: ParticipantInfo[]) => void,
		): MediasoupSocket;
		
		(
			event: "leaveMeeting",
			data: { meetingUuid: string },
			callback: (result: { success: boolean; message?: string }) => void,
		): MediasoupSocket;

		(
			event: "connectTransport",
			data: {
				transportId: string;
				dtlsParameters: mediasoupTypes.DtlsParameters;
			},
			callback: (result: string | { error: string }) => void,
		): MediasoupSocket;

		(
			event: "produce",
			data: {
				transportId: string;
				kind: mediasoupTypes.MediaKind;
				rtpParameters: mediasoupTypes.RtpParameters;
				meetingUuid: string;
			},
			callback: (response: ProduceResponse) => void,
		): MediasoupSocket;

		(
			event: "consume",
			data: { transportId: string; producerId: string },
			callback: (response: ConsumeResponse) => void,
		): MediasoupSocket;
	};

	on: Socket["on"] &
		((
			event: "newProducer",
			listener: (participant: ParticipantInfo) => void,
		) => MediasoupSocket);
};
