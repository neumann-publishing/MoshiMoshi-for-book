import ky from "ky";

export function httpClient({ jwtToken }: { jwtToken?: string } = {}) {
	let headers: {
		Authorization?: string;
	} = {};

	if (jwtToken != null) {
		headers = {
			...headers,
			Authorization: `Bearer ${jwtToken}`,
		};
	}

	return ky.create({
		prefixUrl: import.meta.env.VITE_BACKEND_URL,
		credentials: "include",
		headers,
	});
}
