export function formatError(error: unknown): string {
	if (error && typeof error === "object") {
		const e = error as Record<string, unknown>;
		if ("message" in e && "stack" in e) {
			let result = e.stack as string;
			if (e.cause) {
				result += `\nCaused by: ${formatError(e.cause)}`;
			}
			return result;
		}
	}
	if (typeof error === "string") {
		return error;
	}
	try {
		return JSON.stringify(error, null, 2);
	} catch {
		return String(error);
	}
}
