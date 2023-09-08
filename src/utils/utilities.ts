import {
	configuration,
	ContentSendOnlyMessageMappings,
	ExtensionSendOnlyMessageMappings,
	MessageMappings,
	Messages,
	MessageSource,
	Selector,
	SendDataMessage,
	YoutubePlayerQualityLabel
} from "@/src/types";

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
 * Sends a content send-only message.
 *
 * @param type - The type of the message to send.
 * @param data - The message data.
 */
export function sendContentOnlyMessage<T extends keyof ContentSendOnlyMessageMappings>(type: T, data: ContentSendOnlyMessageMappings[T]["data"]) {
	const message: SendDataMessage<"send_data", "content", T, typeof data> = {
		action: "send_data",
		source: "content",
		type,
		data
	};
	const element = document.getElementById("yte-message-from-youtube");
	if (element) {
		element.textContent = JSON.stringify(message);
		document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
	}
}

/**
 * Sends an extension send-only message.
 *
 * @param type - The type of the message to send.
 * @param data - The message data.
 */
export function sendExtensionOnlyMessage<T extends keyof ExtensionSendOnlyMessageMappings>(
	type: T,
	data: ExtensionSendOnlyMessageMappings[T]["data"]
) {
	const message: SendDataMessage<"send_data", "extension", T, typeof data> = {
		action: "send_data",
		source: "extension",
		type,
		data
	};
	const element = document.getElementById("yte-message-from-extension");
	if (element) {
		element.textContent = JSON.stringify(message);
		document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
	}
}

/**
 * Sends a message from the extension
 *
 * @param type - The type of the message to send.
 * @param action - The action of the message
 * @param data - The message data.
 * @returns A promise that resolves to the response data.
 */
export function sendExtensionMessage<T extends keyof MessageMappings, D>(
	type: T,
	action: MessageMappings[keyof MessageMappings]["response"]["action"],
	data?: D
): Promise<void> {
	const message = {
		action,
		source: "extension",
		type,
		data
	};
	return new Promise((resolve) => {
		const provider = document.getElementById("yte-message-from-extension");
		if (!provider) return;
		provider.textContent = JSON.stringify(message);
		document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
		resolve();
	});
}
/**
 * Sends a message from the content
 *
 * @param type - The type of the message to send.
 * @param action - The action of the message
 * @param data - The message data.
 * @returns A promise that resolves to the response data.
 */
export function sendContentMessage<T extends keyof MessageMappings, D>(
	type: T,
	action: MessageMappings[keyof MessageMappings]["request"]["action"],
	data?: D
): Promise<void> {
	const message = {
		action,
		source: "content",
		type,
		data
	};
	return new Promise((resolve) => {
		const provider = document.getElementById("yte-message-from-youtube");
		if (!provider) return;
		provider.textContent = JSON.stringify(message);
		document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
		resolve();
	});
}

/**
 * Waits for a specific message of the given type, action, source, and data.
 *
 * @param type - The type of the message to wait for.
 * @param action - The action of the message.
 * @param source - The source of the message.
 * @param data - The message data.
 */
export function waitForSpecificMessage<T extends keyof MessageMappings, S extends MessageSource, D>(
	type: T,
	action: MessageMappings[T]["request"]["action"],
	source: S,
	data?: D
): Promise<MessageMappings[T]["response"] | undefined> {
	const message = {
		action,
		source,
		type,
		data
	};
	return new Promise<MessageMappings[T]["response"] | undefined>((resolve) => {
		document.addEventListener("yte-message-from-extension", () => {
			const provider = document.getElementById("yte-message-from-extension");
			if (!provider) return;
			if (!provider.textContent) return;
			const message = JSON.parse(provider.textContent) as Messages["response"];
			if (message && message?.type === type) {
				resolve(message);
			}
		});
		const provider = document.getElementById("yte-message-from-youtube");
		if (!provider) return;
		provider.textContent = JSON.stringify(message);

		document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
	});
}

/**
 * Extracts the first section from a YouTube URL path.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} The first section of the URL path, or null if not found.
 */
function extractFirstSectionFromYouTubeURL(url: string): string | null {
	// Parse the URL into its components
	const { pathname: path } = new URL(url);

	// Split the path into an array of sections
	const sections = path.split("/").filter((section) => section !== "");

	return sections.length > 0 ? sections[0] : null;
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
export function settingsAreDefault(defaultSettings: Partial<configuration>, currentSettings: Partial<configuration>): boolean {
	// Get the keys of the default and current settings
	const defaultKeys = Object.keys(defaultSettings) as Array<keyof configuration>;
	const currentKeys = Object.keys(currentSettings) as Array<keyof configuration>;
	// Calculate the intersection of keys between default and current settings
	const commonKeys = defaultKeys.filter((key) => currentKeys.includes(key));
	// Check that the values of the common keys are the same
	const settingsTheSame = commonKeys.filter((key) => isStrictEqual(defaultSettings[key])(currentSettings[key]));
	// Check if the number of keys that match is the same as the total number of keys
	return isStrictEqual(settingsTheSame.length)(commonKeys.length);
}
