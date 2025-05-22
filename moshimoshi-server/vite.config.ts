import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		devServer({
			adapter: nodeAdapter,
			entry: "src/index.ts",
			exclude: [/^\/node_modules\/.*/, /^\/\.pnpm-store\/.*/],
			ignoreWatching: [/\/node_modules\/.*/, /\/\.pnpm-store\/.*/],
		}),
		build({
			entry: "src/index.ts",
			outputDir: "dist",
			minify: false,
			emptyOutDir: true,
			port: 3000,
		}),
	],
	server: {
		port: 3000,
		host: "0.0.0.0",
		allowedHosts: ["moshimoshi.example.com"],
		watch: {
			ignored: ["node_modules/**", ".pnpm-store/**"],
		},
	},
});
