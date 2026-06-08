import { getFormattedTimestamp } from "@/src/utils/format/date";
import { BrowserColors, type ColorType, TerminalColors } from "@/src/utils/logging/colors";
import { getColor, groupMessages } from "@/src/utils/logging/utils";

/**
 * Log a colored message to the console using the browser-specific colorization.
 *
 * @param message - The message to log.
 * @param type - The type of the log message.
 * @returns The colorized log message.
 */
export function browserColorLog(message: string, type?: ColorType) {
	const prependLog = colorizeLog(`[${getFormattedTimestamp()}] [YouTube Enhancer]`, "FgCyan");
	const colorizedMessage = colorizeLog(message, type);
	console.log(...groupMessages([prependLog, colorizedMessage]));
}
export function colorizeTerminalLog(message: string, type: ColorType = "FgBlack") {
	const color = getColor(type, true);
	return `${color}${message}${TerminalColors.Reset}`;
}

export default function terminalColorLog(message: string, type?: ColorType) {
	console.log(colorizeTerminalLog(`[${getFormattedTimestamp()}] [YouTube Enhancer]`, "FgCyan"), colorizeTerminalLog(message, type));
}

/**
 * Colorize a log message based on the specified type.
 *
 * @param message - The message to log.
 * @param type - The type of the log message.
 * @returns An object containing the colorized message and its styling.
 */
function colorizeLog(message: string, type: ColorType = "FgBlack"): { message: string; styling: string[] } {
	const style = getColor(type);
	return {
		message: `%c${message}%c`,
		styling: [style, BrowserColors.Reset]
	};
}
