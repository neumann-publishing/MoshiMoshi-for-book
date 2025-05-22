import Cookies from "js-cookie";
import { io } from "socket.io-client";
import type { MediasoupSocket } from "../types/mediasoup";

let socket: MediasoupSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Connect to the WebSocket server with timeout handling
 * @returns Socket instance
 */
export const connectSocket = (timeout = 10000): MediasoupSocket => {
	if (socket?.connected) {
		console.log("Socket already connected, reusing connection");
		return socket;
	}

	const jwtToken = Cookies.get("jwt-token");

	if (!jwtToken) {
		console.error("Authentication token is missing");
		throw new Error("Authentication token is required");
	}

	// Get WebSocket URL from environment or use default
	// Note: Using http/https URL works with Socket.io as it automatically converts to ws/wss
	const socketUrl =
		import.meta.env.VITE_WEBSOCKET_URL ||
		`${window.location.protocol}//${window.location.host}:3002`;

	console.log("Connecting to WebSocket server at:", socketUrl);

	// Close any existing socket
	if (socket) {
		socket.disconnect();
		socket = null;
	}

	// Create new socket with better configuration
	socket = io(socketUrl, {
		auth: { token: jwtToken },
		reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
		reconnectionDelay: 1000,
		timeout: timeout,
		transports: ["websocket", "polling"], // Try WebSocket first, fall back to polling if needed
	}) as MediasoupSocket;

	// Setup connection monitoring
	socket.on("connect", () => {
		console.log("Socket connected successfully");
		reconnectAttempts = 0; // Reset reconnect attempts on successful connection
	});

	socket.on("connect_error", (error) => {
		reconnectAttempts++;
		console.error(
			`Socket connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`,
			error,
		);

		if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			console.error("Maximum reconnection attempts reached");
			// You might want to add user notification here
		}
	});

	socket.on("disconnect", (reason) => {
		console.log("Socket disconnected:", reason);

		// If server disconnected us, try to reconnect manually
		if (reason === "io server disconnect") {
			console.log("Attempting to reconnect manually...");
			socket.connect();
		}
	});

	socket.io.on("reconnect", (attempt) => {
		console.log(`Socket reconnected after ${attempt} attempts`);
	});

	socket.io.on("reconnect_attempt", (attempt) => {
		console.log(
			`Socket reconnection attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}...`,
		);
	});

	socket.io.on("reconnect_error", (error) => {
		console.error("Socket reconnection error:", error);
	});

	socket.io.on("reconnect_failed", () => {
		console.error("Failed to reconnect to socket server after all attempts");
		// You might want to add user notification here
	});

	return socket;
};

export const getSocket = (): MediasoupSocket => {
	if (!socket || !socket.connected) {
		try {
			return connectSocket();
		} catch (error) {
			console.error("Failed to get or connect socket:", error);
			throw error;
		}
	}
	return socket;
};

export const closeSocket = () => {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
};

/**
 * Emit an event with a Promise-based response and timeout handling
 * @param eventName Event name to emit
 * @param data Data to send with the event
 * @param timeout Time in milliseconds to wait for a response
 * @returns Promise resolving to the response
 */
export const emitWithPromise = <T>(
	eventName: string,
	data: Record<string, unknown>,
	timeout = 10000,
): Promise<T> => {
	return new Promise((resolve, reject) => {
		try {
			const socket = getSocket();

			// Set a timeout
			const timer = setTimeout(() => {
				console.error(
					`Timeout waiting for ${eventName} response after ${timeout}ms`,
				);
				reject(
					new Error(
						`Timeout waiting for ${eventName} response after ${timeout}ms`,
					),
				);
			}, timeout);

			console.log(`Emitting ${eventName} with data:`, data);
			socket.emit(eventName as string, data, (response: T) => {
				clearTimeout(timer);

				console.log(`Received response for ${eventName}:`, response);

				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				if (response && (response as any).success) {
					resolve(response);
				} else {
					console.error(
						`Error response for ${eventName}:`,
						// biome-ignore lint/suspicious/noExplicitAny: <explanation>
						(response as any)?.error || "Unknown error",
					);
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					reject((response as any)?.error || "Unknown error");
				}
			});
		} catch (error) {
			console.error(`Error emitting ${eventName}:`, error);
			reject(error);
		}
	});
};
