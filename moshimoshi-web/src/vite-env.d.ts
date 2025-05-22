/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL: string;
	readonly VITE_WEBSOCKET_URL: string;
	readonly VITE_WEBSOCKET_PATH: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
