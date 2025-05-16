export function failedToCreateError(path: string) {
	return { path, message: `Failed to create ${path}` };
}

export function uniqueValidationError(path: string) {
	return { path, message: `Already exists ${path}` };
}

export function notFoundError(path: string) {
	return { path, message: "Not found" };
}
