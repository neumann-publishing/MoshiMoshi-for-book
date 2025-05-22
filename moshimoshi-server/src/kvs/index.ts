import "dotenv/config";
import { createClient } from "redis";

export const redis = await createClient({
	url: process.env.REDIS_URL,
})
	.on("error", (error) => console.log("Redis Client Error:", error))
	.connect();

// biome-ignore lint/suspicious/noExplicitAny: accept any
export async function redisSetObj(key: string, obj: any) {
	return await redis.set(key, JSON.stringify(obj));
}

export async function redisGetObj(key: string) {
	const value = await redis.get(key);

	if (value) {
		return JSON.parse(value);
	}

	return null;
}
