import http from "node:http";
import { verify } from "hono/jwt";
import * as mediasoup from "mediasoup";
import type { MediaKind } from "mediasoup/node/lib/rtpParametersTypes.js";
import { Server } from "socket.io";
import "dotenv/config";
import * as meetingsModel from "./models/meetings.js";
import * as participantsModel from "./models/participants.js";

const PORT = process.env.WEBSOCKET_PORT
	? Number(process.env.WEBSOCKET_PORT)
	: 3002;
const JWT_SECRET =
	process.env.JWT_SECRET ??
	"aU2vdTKTBGto9Yh0ElwZGC9QoYDW7Ie7pd0CwqDONgYCFHppa5c6heVgx8CnnAxW9dxkNSVCcat4DyEMGDwq1E20oOF4i9ZCCxgC";

// --- mediasoup setup ---
let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

const mediaCodecs = [
	{
		kind: "audio" as MediaKind,
		mimeType: "audio/opus",
		clockRate: 48000,
		channels: 2,
	},
	{
		kind: "video" as MediaKind,
		mimeType: "video/VP8",
		clockRate: 90000,
	},
];

async function setupMediasoup() {
	worker = await mediasoup.createWorker();
	router = await worker.createRouter({ mediaCodecs });
}

// --- room/peer management ---
type Peer = {
	transports: mediasoup.types.WebRtcTransport[];
	producers: mediasoup.types.Producer[];
	consumers: mediasoup.types.Consumer[];
	userId: number; // ユーザー識別用のIDを追加
};

const peers = new Map<string, Peer>();

// Socket.io type definitions with proper types for authentication data
interface ServerToClientEvents {
	newProducer: (participant: ParticipantInfo) => void;
}

interface ClientToServerEvents {
	getRouterRtpCapabilities: (
		callback: (rtpCapabilities: mediasoup.types.RtpCapabilities) => void,
	) => void;
	createWebRtcTransport: (
		data: { direction: "send" | "recv" },
		callback: (params: TransportParameters) => void,
	) => void;
	connectTransport: (
		data: {
			transportId: string;
			dtlsParameters: mediasoup.types.DtlsParameters;
		},
		callback: (result: string | { error: string }) => void,
	) => void;
	produce: (
		data: {
			transportId: string;
			kind: MediaKind;
			rtpParameters: mediasoup.types.RtpParameters;
			meetingUuid: string;
		},
		callback: (result: ProduceResponse) => void,
	) => void;
	consume: (
		data: { transportId: string; producerId: string },
		callback: (result: ConsumeResponse) => void,
	) => void;
	getParticipants: (
		data: { meetingUuid: string },
		callback: (participants: ParticipantInfo[]) => void,
	) => void;
	leaveMeeting: (
		data: { meetingUuid: string },
		callback: (result: { success: boolean; message?: string }) => void,
	) => void;
	disconnect: () => void;
}

// Data types for responses
interface TransportParameters {
	id: string;
	iceParameters: mediasoup.types.IceParameters;
	iceCandidates: mediasoup.types.IceCandidate[];
	dtlsParameters: mediasoup.types.DtlsParameters;
	error?: string;
}

interface ProduceResponse {
	producerId: string;
	error?: string;
}

interface ConsumeResponse {
	id: string;
	producerId: string;
	kind: MediaKind;
	rtpParameters: mediasoup.types.RtpParameters;
	userId: number;
	error?: string;
}

interface ParticipantInfo {
	userId: number;
	meetingUuid: string;
	producerId: string | null;
	isOwner: boolean;
	userName: string;
	attendedAt: Date | null;
}

interface SocketData {
	userId: number;
}

type InterServerEvents = object;

// --- server setup ---
const httpServer = http.createServer();
const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>(httpServer, {
	cors: {
		origin: process.env.FRONTEND_URL ?? "http://localhost:3001",
		methods: ["GET", "POST"],
	},
});

// JWT認証ミドルウェア
io.use(async (socket, next) => {
	const token = socket.handshake.auth.token;

	if (!token) {
		return next(new Error("Authentication error: Token missing"));
	}

	try {
		const payload = await verify(token, JWT_SECRET);
		// ユーザー情報をソケットオブジェクトに付与
		socket.data.userId = Number(payload.sub);
		console.log("WebSocket authenticated for user:", payload.sub);
		next();
	} catch (err) {
		console.error("WebSocket authentication error:", err);
		return next(new Error("Authentication error: Invalid token"));
	}
});

// mediasoup WebRTC Transport config
const transportOptions: mediasoup.types.WebRtcTransportOptions = {
	listenInfos: [
		{
			protocol: "udp",
			ip: "0.0.0.0",
			announcedAddress: process.env.ANNOUNCED_IP || undefined,
			portRange: { min: 10000, max: 10020 }
		},
		{
			protocol: "tcp",
			ip: "0.0.0.0",
			announcedAddress: process.env.ANNOUNCED_IP || undefined,
			portRange: { min: 10021, max: 10040 }
		},
	],
	enableUdp: true,
	enableTcp: true,
	preferUdp: true,
	initialAvailableOutgoingBitrate: 1000000,
};

io.on("connection", (socket) => {
	console.log("client connected:", socket.id);
	peers.set(socket.id, {
		transports: [],
		producers: [],
		consumers: [],
		userId: socket.data.userId,
	});

	socket.on("getRouterRtpCapabilities", (callback) => {
		callback(router.rtpCapabilities);
	});

	socket.on("createWebRtcTransport", async (_, callback) => {
		try {
			const transport = await router.createWebRtcTransport(transportOptions);
			const peer = peers.get(socket.id);
			if (peer) peer.transports.push(transport);
			const params: TransportParameters = {
				id: transport.id,
				iceParameters: transport.iceParameters,
				iceCandidates: transport.iceCandidates,
				dtlsParameters: transport.dtlsParameters,
			};
			callback(params);
		} catch (err) {
			const error = err as Error;
			callback({
				id: "",
				iceParameters: { usernameFragment: "", password: "", iceLite: false },
				iceCandidates: [],
				dtlsParameters: {
					role: "auto",
					fingerprints: [],
				},
				error: error.message,
			});
		}
	});

	socket.on(
		"connectTransport",
		async ({ transportId, dtlsParameters }, callback) => {
			const peer = peers.get(socket.id);

			if (!peer) return callback({ error: "peer not found" });

			const transport = peer.transports.find((t) => t.id === transportId);

			if (!transport) return callback({ error: "transport not found" });

			await transport.connect({ dtlsParameters });
			callback("ok");
		},
	);

	socket.on(
		"produce",
		async ({ transportId, kind, rtpParameters, meetingUuid }, callback) => {
			const peer = peers.get(socket.id);
			if (!peer) return callback({ error: "peer not found", producerId: "" });

			const transport = peer.transports.find((t) => t.id === transportId);
			if (!transport)
				return callback({ error: "transport not found", producerId: "" });

			try {
				const producer = await transport.produce({ kind, rtpParameters });
				peer.producers.push(producer);

				// userId は socket.data.userId から取得（JWT で認証済み）
				const userId = socket.data.userId;
				console.log(
					`User ${userId} produced ${kind} stream in meeting ${meetingUuid}`,
				);

				const result = await meetingsModel.attend({
					uuid: meetingUuid,
					userId: socket.data.userId,
					producerId: producer.id,
				});

				callback({ producerId: producer.id });

				// 他のクライアントに新しいProducerを通知（userId も含める）
				if (result?.value?.participant) {
					socket.broadcast.emit("newProducer", result.value.participant);
				}
			} catch (err) {
				const error = err as Error;
				console.error("Error producing:", error);
				callback({ error: error.message, producerId: "" });
			}
		},
	);

	socket.on("consume", async ({ transportId, producerId }, callback) => {
		const peer = peers.get(socket.id);
		if (!peer)
			return callback({
				error: "peer not found",
				id: "",
				producerId: "",
				kind: "audio",
				rtpParameters: {
					codecs: [],
					headerExtensions: [],
					encodings: [],
					rtcp: { cname: "", reducedSize: false },
				},
				userId: 0,
			});

		const transport = peer.transports.find((t) => t.id === transportId);
		if (!transport)
			return callback({
				error: "transport not found",
				id: "",
				producerId: "",
				kind: "audio",
				rtpParameters: {
					codecs: [],
					headerExtensions: [],
					encodings: [],
					rtcp: { cname: "", reducedSize: false },
				},
				userId: 0,
			});

		// producer のオーナー (peer) を見つける
		let producerPeer: Peer | undefined;
		for (const p of peers.values()) {
			if (p.producers.some((prod) => prod.id === producerId)) {
				producerPeer = p;
				break;
			}
		}

		if (!producerPeer) {
			return callback({
				error: "producer not found",
				id: "",
				producerId: "",
				kind: "audio",
				rtpParameters: {
					codecs: [],
					headerExtensions: [],
					encodings: [],
					rtcp: { cname: "", reducedSize: false },
				},
				userId: 0,
			});
		}

		try {
			const consumer = await transport.consume({
				producerId,
				rtpCapabilities: router.rtpCapabilities,
				paused: false,
			});

			peer.consumers.push(consumer);

			callback({
				id: consumer.id,
				producerId: consumer.producerId,
				kind: consumer.kind,
				rtpParameters: consumer.rtpParameters,
				userId: producerPeer.userId,
			});
		} catch (err) {
			const error = err as Error;
			console.error("Error consuming:", error);
			callback({
				error: error.message,
				id: "",
				producerId: "",
				kind: "audio",
				rtpParameters: {
					codecs: [],
					headerExtensions: [],
					encodings: [],
					rtcp: { cname: "", reducedSize: false },
				},
				userId: 0,
			});
		}
	});

	// 特定のミーティングに参加している参加者の情報を取得するハンドラを追加
	socket.on("getParticipants", async ({ meetingUuid }, callback) => {
		try {
			// ミーティングの参加者情報をDBから取得
			const participants = await participantsModel.getParticipantsByMeetingUuid(meetingUuid);
			
			// プロデューサー情報を含む参加者リストを作成
			const participantsWithProducers: ParticipantInfo[] = [];
			
			for (const participant of participants) {
				// 対応するピアを探す
				let producerId: string | null = participant.producerId;
				
				// プロデューサーIDがなく、オンラインユーザーの場合は現在接続中のピアから探す
				if (!producerId) {
					for (const [_, peer] of peers.entries()) {
						if (peer.userId === participant.userId && peer.producers.length > 0) {
							// ピアに関連付けられたプロデューサーがあれば、最初のものを使用
							producerId = peer.producers[0].id;
							break;
						}
					}
				}
				
				participantsWithProducers.push({
					userId: participant.userId,
					meetingUuid,
					producerId,
					isOwner: participant.isOwner,
					userName: participant.userName,
					attendedAt: participant.attendedAt,
				});
			}
			
			console.log(`Sending participants info for meeting ${meetingUuid}:`, participantsWithProducers);
			callback(participantsWithProducers);
		} catch (error) {
			console.error(`Error getting participants for meeting ${meetingUuid}:`, error);
			callback([]);
		}
	});

	// 会議退出処理のためのイベントハンドラ
	socket.on("leaveMeeting", async ({ meetingUuid }, callback) => {
		try {
			const result = await meetingsModel.leave({
				uuid: meetingUuid,
				userId: socket.data.userId,
			});
			
			if (!result.success) {
				console.error(`Failed to leave meeting ${meetingUuid} for user ${socket.data.userId}`);
				callback({ success: false, message: "Failed to leave meeting" });
				return;
			}
			
			console.log(`User ${socket.data.userId} left meeting ${meetingUuid}`);
			
			// 他の参加者のプロデューサーが存在する場合は削除する
			const peer = peers.get(socket.id);
			if (peer) {
				// トランスポートをクローズ
				for (const transport of peer.transports) {
					try {
						await transport.close();
					} catch (error) {
						console.error(`Error closing transport for user ${socket.data.userId}:`, error);
					}
				}
				
				// プロデューサーをクローズ
				for (const producer of peer.producers) {
					try {
						await producer.close();
					} catch (error) {
						console.error(`Error closing producer for user ${socket.data.userId}:`, error);
					}
				}
				
				// コンシューマーをクローズ
				for (const consumer of peer.consumers) {
					try {
						await consumer.close();
					} catch (error) {
						console.error(`Error closing consumer for user ${socket.data.userId}:`, error);
					}
				}
			}
			
			callback({ success: true, message: "Successfully left the meeting" });
		} catch (error) {
			console.error(`Error handling leaveMeeting for ${meetingUuid}:`, error);
			callback({ success: false, message: "Internal server error" });
		}
	});

	socket.on("disconnect", () => {
		peers.delete(socket.id);
		console.log("client disconnected:", socket.id);
	});
});

setupMediasoup().then(() => {
	httpServer.listen(PORT, () => {
		console.log(`WebSocket+mediasoup server running on :${PORT}`);
	});
});
