export type ModelResponse = {
	success: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: no problem
	value: any;
};

export type User = {
	id: number;
	email: string;
	name: string;
};
