/**
 * Renders an unknown thrown value for display: an error's stack (with each `cause` chain appended),
 * a plain string as-is, anything else pretty-printed as JSON (falling back to `String` for values
 * JSON cannot represent, such as circular structures).
 */
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
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error, null, 2);
	} catch {
		return String(error);
	}
}
