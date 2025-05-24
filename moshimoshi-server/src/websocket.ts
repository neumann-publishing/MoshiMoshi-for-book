import http from "node:http";
import "dotenv/config";
import * as mediasoup from "mediasoup";
import type { MediaKind } from "mediasoup/node/lib/rtpParametersTypes.js";
import { Server } from "socket.io";

const PORT = process.env.WEBSOCKET_PORT
	? Number(process.env.WEBSOCKET_PORT)
	: 3002;

// --- mediasoup setup ---
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
const worker = await mediasoup.createWorker();
const router = await worker.createRouter({ mediaCodecs });

const httpServer = http.createServer();
const io = new Server(httpServer, {
	cors: {
		origin: process.env.FRONTEND_URL ?? "https://moshimoshi.example.com",
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket) => {
	socket.on("getRouterRtpCapabilities", (callback) => {
		callback(router.rtpCapabilities);
	});
});

httpServer.listen(PORT, () => {
	console.log(`WebSocket+mediasoup server running on :${PORT}`);
});
