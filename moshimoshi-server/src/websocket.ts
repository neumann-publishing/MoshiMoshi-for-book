import http from "node:http";
import "dotenv/config";
import { Server } from "socket.io";

const PORT = process.env.WEBSOCKET_PORT
	? Number(process.env.WEBSOCKET_PORT)
	: 3002;

const httpServer = http.createServer();
const io = new Server(httpServer, {
	cors: {
		origin: process.env.FRONTEND_URL ?? "https://moshimoshi.example.com",
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket) => {
	socket.on("foo", (callback) => {
		// … ここに処理を書く
	});
});

httpServer.listen(PORT, () => {
	console.log(`WebSocket+mediasoup server running on :${PORT}`);
});
