export function formatError(error: unknown) {
	if (error instanceof Error) {
		return `${error.message}\n${error?.stack}`;
	} else if (error instanceof String) {
		return error.toString();
	} else {
		return "Unknown error";
	}
}
