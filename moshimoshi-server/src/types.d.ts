export type ModelResponse<T> = {
	success: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: no problem
	value: any;
};
