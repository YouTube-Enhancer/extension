import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
	AnyFunction,
	ContentSendOnlyMessageMappings,
	ExtensionSendOnlyMessageMappings,
	MessageMappings,
	MessageSource,
	Messages,
	OnScreenDisplayPosition,
	Selector,
	SendDataMessage,
	YoutubePlayerQualityLevel,
	configuration
} from "../types";
import type { SVGElementAttributes } from "./SVGElementAttributes";

import { youtubePlayerQualityLevel } from "../types";
import { type FeatureName, eventManager } from "./EventManager";

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

export function chooseClosestQuality(
	selectedQuality: YoutubePlayerQualityLevel,
	availableQualities: YoutubePlayerQualityLevel[]
): YoutubePlayerQualityLevel | null {
	// If there are no available qualities, return null
	if (availableQualities.length === 0) {
		return null;
	}

	// Find the index of the selected quality in the array
	const selectedIndex = youtubePlayerQualityLevel.indexOf(selectedQuality);

	// If the selected quality is not in the array, return null
	if (selectedIndex === -1) {
		return null;
	}

	// Find the available quality levels that are closest to the selected quality level
	const closestQualities = availableQualities.reduce(
		(acc, quality) => {
			const qualityIndex = youtubePlayerQualityLevel.indexOf(quality);
			if (qualityIndex !== -1) {
				acc.push({ difference: Math.abs(selectedIndex - qualityIndex), quality });
			}
			return acc;
		},
		[] as { difference: number; quality: YoutubePlayerQualityLevel }[]
	);

	// Sort the closest qualities by difference in ascending order
	closestQualities.sort((a, b) => a.difference - b.difference);

	// Return the quality level with the minimum difference
	return closestQualities[0].quality;
}
const BrowserColors = {
	BgBlack: "background-color: black; color: white;",
	BgBlue: "background-color: blue; color: white;",
	BgCyan: "background-color: cyan; color: black;",
	BgGreen: "background-color: green; color: white;",
	BgMagenta: "background-color: magenta; color: white;",
	BgRed: "background-color: red; color: white;",
	BgWhite: "background-color: white; color: black;",
	BgYellow: "background-color: yellow; color: black;",
	Blink: "animation: blink 1s infinite;",
	Bright: "font-weight: bold;",
	Dim: "opacity: 0.6;",
	FgBlack: "color: black;",
	FgBlue: "color: blue;",
	FgCyan: "color: cyan;",
	FgGreen: "color: green;",
	FgMagenta: "color: magenta;",
	FgRed: "color: red;",
	FgWhite: "color: white;",
	FgYellow: "color: yellow;",
	Hidden: "visibility: hidden;",
	Reset: "color: inherit; background-color: inherit;",
	Reverse: "background-color: inherit; color: inherit;",
	Underscore: "text-decoration: underline;"
} as const;

type ColorType = "error" | "info" | "success" | "warning" | keyof typeof BrowserColors;
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
			if (typeof type === "string" && BrowserColors[type]) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				({ [`${type}`]: style } = BrowserColors);
			}
			break;
		}
	}

	return {
		message: `%c${message}%c`,
		styling: [style, BrowserColors.Reset]
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

/**
 * Sends a content send-only message.
 *
 * @param type - The type of the message to send.
 * @param data - The message data.
 */
export function sendContentOnlyMessage<T extends keyof ContentSendOnlyMessageMappings>(type: T, data: ContentSendOnlyMessageMappings[T]["data"]) {
	const message: SendDataMessage<"send_data", "content", T, typeof data> = {
		action: "send_data",
		data,
		source: "content",
		type
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
		data,
		source: "extension",
		type
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
		data,
		source: "extension",
		type
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
		data,
		source: "content",
		type
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
		data,
		source,
		type
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
function extractFirstSectionFromYouTubeURL(url: string): null | string {
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
	if (error instanceof Error) {
		return `${error.message}\n${error?.stack}`;
	} else if (error instanceof String) {
		return error.toString();
	} else {
		return "Unknown error";
	}
}
/**
 * Wait for all elements to appear in the document.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @returns Promise that resolves with an array of the matching elements.
 */
export function waitForAllElements(selectors: Selector[]): Promise<Selector[]> {
	// Create a promise that will resolve when all of the target elements are found.
	return new Promise((resolve) => {
		// Log a message to the console to let the user know what's happening.
		browserColorLog(`Waiting for ${selectors.join(", ")}`, "FgMagenta");
		// Create a Map to store the elements as they are found.
		const elementsMap = new Map<string, Element | null>();
		// Get the number of selectors in the array so we know how many elements we are waiting for.
		const { length: selectorsCount } = selectors;
		// Create a counter for the number of elements that have been found.
		let resolvedCount = 0;
		// Create a MutationObserver to watch for changes in the DOM.
		const observer = new MutationObserver(() => {
			// Loop through each of the selectors.
			selectors.forEach((selector) => {
				// Get the element that matches the selector.
				const element = document.querySelector(selector);
				// Add the element to the Map.
				elementsMap.set(selector, element);
				// If the element is not found, return early.
				if (!element) {
					return;
				}
				// Increase the counter by 1.
				resolvedCount++;
				// If the number of resolved elements is equal to the number of selectors in the array, all of the elements have been found.
				if (resolvedCount === selectorsCount) {
					// Disconnect the observer so it doesn't keep running.
					observer.disconnect();
					// Get an array of the resolved elements.
					const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
					// Resolve the promise with the array of resolved elements.
					resolve(resolvedElements);
				}
			});
		});
		// Start listening for changes to the DOM.
		observer.observe(document, { childList: true, subtree: true });
		// Loop through each of the selectors.
		selectors.forEach((selector) => {
			// Get the element that matches the selector.
			const element = document.querySelector(selector);
			// Add the element to the Map.
			elementsMap.set(selector, element);
			// If the element is not found, return early.
			if (!element) {
				return;
			}
			// Increase the counter by 1.
			resolvedCount++;
			// If the number of resolved elements is equal to the number of selectors in the array, all of the elements have been found.
			if (resolvedCount === selectorsCount) {
				// Disconnect the observer so it doesn't keep running.
				observer.disconnect();
				// Get an array of the resolved elements.
				const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
				// Resolve the promise with the array of resolved elements.
				resolve(resolvedElements);
			}
		});
	});
}
export function settingsAreDefault(defaultSettings: Partial<configuration>, currentSettings: Partial<configuration>): boolean {
	// Get the keys of the default and current settings
	const defaultKeys = Object.keys(defaultSettings);
	const currentKeys = Object.keys(currentSettings);
	// Calculate the intersection of keys between default and current settings
	const commonKeys = defaultKeys.filter((key) => currentKeys.includes(key));
	// Check that the values of the common keys are the same
	const settingsTheSame = commonKeys.filter((key) => isStrictEqual(defaultSettings[key])(currentSettings[key]));
	// Check if the number of keys that match is the same as the total number of keys
	return isStrictEqual(settingsTheSame.length)(commonKeys.length);
}
export function formatDateForFileName(date: Date): string {
	const dateFormatOptions: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	};

	const timeFormatOptions: Intl.DateTimeFormatOptions = {
		hour: "2-digit",
		hour12: false, // Ensure 24-hour time format
		minute: "2-digit",
		second: "2-digit"
	};

	// Get the user's locale
	const userLocale = navigator.language || "en-GB";

	const formattedDate = date.toLocaleDateString(userLocale, dateFormatOptions);
	const formattedTime = date.toLocaleTimeString(userLocale, timeFormatOptions);

	// Replace characters that can't be used in a filename
	const sanitizedDate = formattedDate.replace(/[\/]/g, "-");
	const sanitizedTime = formattedTime.replace(/[:]/g, "-");

	return `${sanitizedDate}_${sanitizedTime}`;
}
export function parseStoredValue(value: string) {
	try {
		// Attempt to parse the value as JSON
		const parsedValue = JSON.parse(value);
		// Check if the parsed value is a boolean or a number
		if (typeof parsedValue === "boolean" || typeof parsedValue === "number" || typeof parsedValue === "object") {
			return parsedValue; // Return the parsed value
		}
	} catch (error) {
		// If parsing or type checking fails, return the original value as a string
	}
	// If parsing or type checking fails, return the original value as a string
	return value;
}
export function createTooltip({
	direction = "up",
	element,
	featureName,
	id,
	text
}: {
	direction?: "down" | "left" | "right" | "up";
	element: HTMLElement;
	featureName: FeatureName;
	id: `yte-feature-${FeatureName}-tooltip`;
	text?: string;
}): {
	listener: () => void;
	remove: () => void;
	update: () => void;
} {
	function makeTooltip() {
		const rect = element.getBoundingClientRect();
		// Create tooltip element
		const tooltip = createStyledElement({
			classlist: ["yte-button-tooltip", "ytp-tooltip", "ytp-rounded-tooltip", "ytp-bottom"],
			elementId: id,
			elementType: "div",
			styles: {
				...conditionalStyles({
					condition: direction === "down" || direction === "up",
					left: `${rect.left + rect.width / 2}px`
				}),
				...conditionalStyles({
					condition: direction === "up",
					top: `${rect.top - 2}px`
				}),
				...conditionalStyles({
					condition: direction === "down",
					top: `${rect.bottom + rect.height}px`
				}),
				...conditionalStyles({
					condition: direction === "left",
					left: `${rect.left - rect.width}px`,
					top: `${rect.bottom}px`
				}),
				...conditionalStyles({
					condition: direction === "right",
					left: `${rect.right + rect.width}px`,
					top: `${rect.bottom}px`
				}),
				zIndex: "99999"
			}
		});
		const {
			dataset: { title }
		} = element;
		tooltip.textContent = text ?? title ?? "";
		function mouseLeaveListener() {
			tooltip.remove();
		}
		eventManager.addEventListener(element, "mouseleave", mouseLeaveListener, featureName);
		return tooltip;
	}
	return {
		listener: () => {
			const tooltipExists = document.getElementById(id) !== null;
			if (tooltipExists) {
				const tooltip = document.getElementById(id);
				if (!tooltip) return;
				tooltip.remove();
			}
			const tooltip = makeTooltip();
			document.body.appendChild(tooltip);
		},
		remove: () => {
			const tooltip = document.getElementById(id);
			if (!tooltip) return;
			tooltip.remove();
		},
		update: () => {
			const tooltip = document.getElementById(id);
			if (!tooltip) return;
			tooltip.textContent = element.dataset.title ?? "";
		}
	};
}
export function removeTooltip(id: `yte-feature-${FeatureName}-tooltip`) {
	const tooltip = document.getElementById(id);
	if (!tooltip) return;
	tooltip.remove();
}
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
export function conditionalStyles(...input: ({ condition: boolean } & Partial<CSSStyleDeclaration>)[]) {
	return input.reduce((acc, { condition, ...style }) => (condition ? { ...acc, ...style } : acc), {} as Partial<CSSStyleDeclaration>);
}
// Utility function to create and style an element
export function createStyledElement<ID extends string, K extends keyof HTMLElementTagNameMap>({
	classlist,
	elementId,
	elementType,
	styles
}: {
	classlist?: string[];
	elementId: ID;
	elementType: K;
	styles?: Partial<CSSStyleDeclaration>;
}): HTMLElementTagNameMap[K] {
	// Check if the element already exists
	const elementExists = document.getElementById(elementId) !== null;
	// If the element exists, use it, otherwise create a new element
	const element = (elementExists ? document.getElementById(elementId) : document.createElement(elementType)) as HTMLElementTagNameMap[K];
	// If the element was newly created, set its id
	if (!element.id) element.id = elementId;
	// Apply the styles to the element
	Object.assign(element.style, styles);
	if (classlist) {
		// Add the classes to the element
		element.classList.add(...classlist);
	}
	// Return the element
	return element;
}
type SVGChildElement = SVGElement | SVGPathElement | SVGTSpanElement | SVGTextElement;

export function createSVGElement<K extends keyof SVGElementTagNameMap>(
	tagName: K,
	attributes?: SVGElementAttributes<K>,
	...children: SVGChildElement[]
): SVGElementTagNameMap[K] {
	const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);

	if (attributes) {
		Object.entries(attributes).forEach(([key, value]) => {
			element.setAttribute(key, String(value));
		});
	}

	children.forEach((child) => {
		element.appendChild(child);
	});

	return element;
}
export function preventScroll(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
}
export function calculateCanvasPosition(displayPosition: OnScreenDisplayPosition, displayPadding: number, paddingTop: number, paddingBottom: number) {
	let styles: Partial<CSSStyleDeclaration> = {};

	switch (displayPosition) {
		case "top_left":
			styles = { left: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		case "top_right":
			styles = { right: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		case "bottom_left":
			styles = { bottom: `${displayPadding + paddingBottom}px`, left: `${displayPadding}px` };
			break;
		case "bottom_right":
			styles = { bottom: `${displayPadding + paddingBottom}px`, right: `${displayPadding}px` };
			break;
		case "center":
			styles = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
			break;
		default:
			console.error("Invalid display position");
			break;
	}

	return styles;
}
export function debounce(func: AnyFunction, delay: number) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}
