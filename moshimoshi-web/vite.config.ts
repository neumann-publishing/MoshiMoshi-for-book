import react from "@vitejs/plugin-react";
import { defineConfig, preprocessCSS } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		port: 3001,
		host: "0.0.0.0",
		allowedHosts: ["moshimoshi.example.com"],
	},
});
