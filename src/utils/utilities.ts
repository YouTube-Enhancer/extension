import { MessageData, MessageTypes, Selector, YoutubePlayerQualityLabel } from "@/src/types";
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

/**
 * Send a message to the extension.
 *
 * @template T - The type of the message event.
 * @param {T} eventType - The type of the message event.
 * @param {Omit<MessageData<T>, "type">} data - The data to be included in the message.
 */
export function sendMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">) {
	// Create the message object
	const message: Omit<MessageData<typeof eventType>, "type"> = {
		type: eventType,
		source: "extension",
		...data
	};

	// Convert the message object to a string
	const stringifiedMessage = JSON.stringify(message);
	const element = document.getElementById("yte-message-from-youtube");
	if (!element) return;
	// Set the text content of an element (e.g., a hidden div) with the stringified message
	element.textContent = stringifiedMessage;

	// Dispatch a custom event to notify the extension about the message
	document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
}
/**
 * Wait for a specific message of the given event type and return the message data.
 *
 * @param {T} eventType - The type of the event to wait for.
 * @param {Omit<MessageData<T>, "type">} data - The data to send along with the message.
 * @returns {Promise<MessageData<T>>} A promise that resolves to the received message data.
 */
export function waitForSpecificMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">): Promise<MessageData<T>> {
	return new Promise((resolve) => {
		/**
		 * Handles the received message and resolves the promise if it matches the expected event type.
		 */
		function handleMessage() {
			const provider = document.querySelector("#yte-message-from-extension");
			if (!provider) return;
			const { textContent: stringifiedMessage } = provider;
			if (!stringifiedMessage) return;
			let message;
			try {
				message = JSON.parse(stringifiedMessage) as MessageData<T>;
			} catch (error) {
				console.error(error);
				return;
			}
			if (!message) return;
			if (message.type && message.type === eventType) {
				document.removeEventListener("yte-message-from-extension", handleMessage);
				resolve(message as MessageData<T>);
			}
		}

		// Add event listener to listen for the specific message
		document.addEventListener("yte-message-from-extension", handleMessage);

		// Send the message
		sendMessage(eventType, data);
	});
}
/**
 * Extracts the first section from a YouTube URL path.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} The first section of the URL path, or null if not found.
 */
function extractFirstSectionFromYouTubeURL(url: string): string | null {
	// Parse the URL into its components
	const urlObj = new URL(url);
	const { pathname: path } = urlObj;

	// Split the path into an array of sections
	const sections = path.split("/").filter((section) => section !== "");

	// Return the first section, or null if not found
	if (sections.length > 0) {
		return sections[0];
	}

	return null; // or any default value if desired
}
export function isWatchPage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "watch";
}
export function isShortsPage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "shorts";
}
export function formatError(error: unknown) {
	return error instanceof Error
		? `\n${error.stack}\n\n${error.message}`
		: error instanceof Object
		? Object.hasOwnProperty.call(error, "toString") && typeof error.toString === "function"
			? error.toString()
			: "unknown error"
		: "";
}
/**
 * Wait for all elements to appear in the document.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @returns Promise that resolves with an array of the matching elements.
 */
export function waitForAllElements(selectors: Selector[]): Promise<Selector[]> {
	return new Promise((resolve) => {
		setTimeout(() => {
			browserColorLog("Waiting for target nodes", "FgMagenta");
			const elementsMap = new Map<string, Element | null>();
			const { length: selectorsCount } = selectors;
			let resolvedCount = 0;

			const observer = new MutationObserver(() => {
				selectors.forEach((selector) => {
					const element = document.querySelector(selector);
					elementsMap.set(selector, element);
					if (!element) {
						return;
					}

					resolvedCount++;
					if (resolvedCount === selectorsCount) {
						observer.disconnect();
						const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
						resolve(resolvedElements);
					}
				});
			});

			observer.observe(document, { childList: true, subtree: true });

			selectors.forEach((selector) => {
				const element = document.querySelector(selector);
				elementsMap.set(selector, element);
				if (!element) {
					return;
				}

				resolvedCount++;
				if (resolvedCount === selectorsCount) {
					observer.disconnect();
					const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
					resolve(resolvedElements);
				}
			});
		}, 2_500);
	});
}
