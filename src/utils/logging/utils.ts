import { BrowserColors, type ColorType, TerminalColors } from "@/src/utils/logging/colors";

export function getColor(type: ColorType, terminal = false) {
	const color = terminal ? TerminalColors : BrowserColors;
	switch (type) {
		case "error":
			return color.FgRed;
		case "info":
			return color.FgBlue;
		case "success":
			return color.FgGreen;
		case "warning":
			return color.FgYellow;
		default:
			return color[type];
	}
}
/**
 * Group multiple log messages into a single message with combined styling.
 *
 * @param messages - Array of log messages with their styling.
 * @returns An array containing the combined message and its styling.
 */
export function groupMessages(messages: { message: string; styling: string[] }[]): Array<string | string[]> {
	const message = messages.map((m) => m.message).join(" ");
	const styling = messages.map((m) => m.styling).flat();
	return [message, ...styling];
}
