import { YoutubePlayerQualityLabel } from "../types";

export const isStrictEqual = (value1: unknown) => (value2: unknown) => value1 === value2;
export const isNotStrictEqual = (value1: unknown) => (value2: unknown) => value1 !== value2;

export const isIncludedIn = (array: unknown[]) => (item: unknown) => array.includes(item);

export const stopPropagation = (e: Event) => e.stopPropagation();

export const removeSpecialCharacters = (value: string) => {
	return value.replace(/[<>:"|?*]/g, "");
};

export const unique = (values: string[]) => [...new Set(values)];

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const round = (value: number, decimals = 0) => Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`);

export const toDivisible = (value: number, divider: number): number => Math.ceil(value / divider) * divider;

export const chooseClosetQuality = (num: YoutubePlayerQualityLabel, arr: YoutubePlayerQualityLabel[]): YoutubePlayerQualityLabel => {
	const parsedNum = parseInt(num, 10);
	let [curr] = arr;
	let currDiff = Math.abs(parsedNum - parseInt(curr));

	for (let i = 1; i < arr.length; i++) {
		const label = arr.at(i);
		if (!label) continue;
		const parsedLabel = parseInt(label);
		const diff = Math.abs(parsedNum - parsedLabel);

		if (diff < currDiff) {
			curr = label;
			currDiff = diff;
		}
	}

	return curr;
};
const COLORS = {
	Reset: "color: inherit; background-color: inherit;",
	Bright: "font-weight: bold;",
	Dim: "opacity: 0.6;",
	Underscore: "text-decoration: underline;",
	Blink: "animation: blink 1s infinite;",
	Reverse: "background-color: inherit; color: inherit;",
	Hidden: "visibility: hidden;",
	FgBlack: "color: black;",
	FgRed: "color: red;",
	FgGreen: "color: green;",
	FgYellow: "color: yellow;",
	FgBlue: "color: blue;",
	FgMagenta: "color: magenta;",
	FgCyan: "color: cyan;",
	FgWhite: "color: white;",
	BgBlack: "background-color: black; color: white;",
	BgRed: "background-color: red; color: white;",
	BgGreen: "background-color: green; color: white;",
	BgYellow: "background-color: yellow; color: black;",
	BgBlue: "background-color: blue; color: white;",
	BgMagenta: "background-color: magenta; color: white;",
	BgCyan: "background-color: cyan; color: black;",
	BgWhite: "background-color: white; color: black;"
} as const;

type ColorType = "success" | "info" | "error" | "warning" | keyof typeof COLORS;
/**
 * Colorize a log message based on the specified type.
 *
 * @param message - The message to log.
 * @param type - The type of the log message.
 * @returns An object containing the colorized message and its styling.
 */
function colorizeLog(message: string, type?: ColorType): { message: string; styling: string[] } {
	type = type || "FgBlack";
	let style = "";

	switch (type) {
		case "success":
			style = "color: green;";
			break;
		case "info":
			style = "color: blue;";
			break;
		case "error":
			style = "color: red;";
			break;
		case "warning":
			style = "color: yellow;";
			break;
		default: {
			if (typeof type === "string" && COLORS[type]) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				({ [`${type}`]: style } = COLORS);
			}
			break;
		}
	}

	return {
		message: `%c${message}%c`,
		styling: [style, COLORS.Reset]
	};
}
/**
 * Group multiple log messages into a single message with combined styling.
 *
 * @param messages - Array of log messages with their styling.
 * @returns An array containing the combined message and its styling.
 */
function groupMessages(messages: { message: string; styling: string[] }[]): Array<string | string[]> {
	const message = messages.map((m) => m.message).join(" ");
	const styling = messages.map((m) => m.styling).flat();
	return [message, ...styling];
}
/**
 * Log a colored message to the console using the browser-specific colorization.
 *
 * @param message - The message to log.
 * @param type - The type of the log message.
 * @returns The colorized log message.
 */
export function browserColorLog(message: string, type?: ColorType) {
	const prependLog = colorizeLog(`[YouTube Enhancer]`, "FgCyan");
	const colorizedMessage = colorizeLog(message, type);
	console.log(...groupMessages([prependLog, colorizedMessage]));
}

export function parseReviver(key: string, value: unknown) {
	// Check if the value is a string
	if (typeof value === "string") {
		// Convert "true" or "false" to boolean
		if (value === "true") {
			return true;
		} else if (value === "false") {
			return false;
		}

		// Convert a string of a number to a number
		const parsedNumber = parseFloat(value);
		if (!isNaN(parsedNumber)) {
			return parsedNumber;
		}
	}

	// Return the value as is
	return value;
}
