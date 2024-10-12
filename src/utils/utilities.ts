import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
	ActionMessage,
	AllButtonNames,
	AnyFunction,
	ButtonPlacementChange,
	ContentSendOnlyMessageMappings,
	ContentToBackgroundSendOnlyMessageMappings,
	DeepPartial,
	ExtensionSendOnlyMessageMappings,
	FeatureToMultiButtonMap,
	MessageMappings,
	MessageSource,
	Messages,
	MultiButtonChange,
	Nullable,
	OnScreenDisplayPosition,
	Path,
	PathValue,
	PlayerQualityFallbackStrategy,
	Selector,
	SendDataMessage,
	SingleButtonChange,
	SingleButtonFeatureNames,
	SingleButtonNames,
	YoutubePlayerQualityLevel,
	configuration
} from "../types";
import type { SVGElementAttributes } from "./SVGElementAttributes";

import { buttonNameToSettingName, featureToMultiButtonsMap, youtubePlayerQualityLevels } from "../types";
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
export const round = (value: number, decimals = 0) => Number(`${Math.round(Number(`${value + Number.EPSILON}e${decimals}`))}e-${decimals}`);

export const toDivisible = (value: number, divider: number): number => Math.ceil(value / divider) * divider;

export function chooseClosestQuality(
	selectedQuality: YoutubePlayerQualityLevel,
	availableQualities: YoutubePlayerQualityLevel[],
	fallbackStrategy: PlayerQualityFallbackStrategy
): Nullable<YoutubePlayerQualityLevel> {
	// If there are no available qualities, return null
	if (availableQualities.length === 0) {
		return null;
	}

	// If the selected quality is available, return it
	if (availableQualities.includes(selectedQuality)) {
		return selectedQuality;
	}

	// Find the index of the selected quality in the array
	const selectedIndex = youtubePlayerQualityLevels.indexOf(selectedQuality);

	// Find the available quality levels that are closest to the selected quality level
	const closestQualities = availableQualities.reduce(
		(acc, quality) => {
			const qualityIndex = youtubePlayerQualityLevels.indexOf(quality);
			if (qualityIndex !== -1) {
				acc.push({ difference: Math.abs(selectedIndex - qualityIndex), quality, qualityIndex });
			}
			return acc;
		},
		[] as { difference: number; quality: YoutubePlayerQualityLevel; qualityIndex: number }[]
	);

	// Sort the closest qualities by difference in ascending order
	closestQualities.sort((a, b) => a.difference - b.difference);

	// If fallback strategy is "higher", prefer higher quality levels
	if (fallbackStrategy === "higher") {
		for (const { quality, qualityIndex } of closestQualities) {
			if (qualityIndex > selectedIndex) {
				return quality;
			}
		}
	}

	// If fallback strategy is "lower", prefer lower quality levels
	if (fallbackStrategy === "lower") {
		for (const { quality, qualityIndex } of closestQualities) {
			if (qualityIndex < selectedIndex) {
				return quality;
			}
		}
	}
	return null;
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
function getColor(type: ColorType) {
	switch (type) {
		case "error":
			return BrowserColors.FgRed;
		case "info":
			return BrowserColors.FgBlue;
		case "success":
			return BrowserColors.FgGreen;
		case "warning":
			return BrowserColors.FgYellow;
		default:
			return BrowserColors[type];
	}
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
	const prependLog = colorizeLog(`[${getFormattedTimestamp()}] [YouTube Enhancer]`, "FgCyan");
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
 * Sends a content message to the background.
 *
 * @param {T} type - The type of the content message.
 * @param {ContentToBackgroundSendOnlyMessageMappings[T]["data"]} data - The data of the content message.
 * @return {Promise<void>} A promise that resolves when the message is sent.
 */
export function sendContentToBackgroundMessage<T extends keyof ContentToBackgroundSendOnlyMessageMappings>(
	type: T,
	data?: ContentToBackgroundSendOnlyMessageMappings[T]["data"]
): Promise<void> {
	const message: ActionMessage<T, typeof data> = {
		action: "request_action",
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
): Promise<MessageMappings[T]["response"]> {
	const message = {
		action,
		data,
		source,
		type
	};
	return new Promise<MessageMappings[T]["response"]>((resolve) => {
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
export function isPlaylistPage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "playlist";
}
export function isLivePage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "live";
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
		const elementsMap = new Map<string, Nullable<Element>>();
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
	id: `yte-feature-${AllButtonNames | Exclude<FeatureName, SingleButtonNames>}-tooltip`;
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
export function getPathValue<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
	const keys = (typeof path === "string" ? path.split(".") : [path]) as Array<keyof T>;
	let value: any = obj;

	for (const key of keys) {
		if (value && typeof value === "object" && key in value) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			({ [key]: value } = value);
		} else {
			console.error(`Invalid path: ${String(path)}`);
		}
	}

	return value as PathValue<T, P>;
}
export type ModifyElementAction = "add" | "remove";
export type ElementClassPair = { className: string; element: Nullable<Element> };
export function modifyElementClassList(action: ModifyElementAction, elementPair: ElementClassPair) {
	const { className, element } = elementPair;
	element?.classList[action](className);
}
export function modifyElementsClassList(action: ModifyElementAction, elements: ElementClassPair[]) {
	elements.forEach((element) => modifyElementClassList(action, element));
}
export function findKeyByValue(value: Exclude<AllButtonNames, SingleButtonFeatureNames>) {
	for (const [key, values] of featureToMultiButtonsMap.entries()) {
		if (values.includes(value)) {
			return key;
		}
	}
	return undefined; // Key not found
}
export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			if (merged[key] && typeof merged[key] === "object") {
				merged[key] = deepMerge(merged[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
			} else {
				// eslint-disable-next-line prefer-destructuring
				merged[key] = source[key];
			}
		}
	}

	return merged;
}

export function groupButtonChanges(changes: ButtonPlacementChange): {
	multiButtonChanges: MultiButtonChange;
	singleButtonChanges: SingleButtonChange;
} {
	const multiButtonChanges: DeepPartial<MultiButtonChange> = {};
	const singleButtonChanges: DeepPartial<SingleButtonChange> = {};

	Object.keys(changes.buttonPlacement).forEach((button) => {
		const buttonName = button;
		if (
			!Array.from(featureToMultiButtonsMap.keys())
				.map((key) => featureToMultiButtonsMap.get(key))
				.flat()
				.includes(buttonName)
		)
			// eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-unnecessary-type-assertion
			return (singleButtonChanges[buttonName as SingleButtonFeatureNames] = changes.buttonPlacement[buttonName]);
		const multiButtonFeatureNames = findKeyByValue(buttonName as Exclude<AllButtonNames, SingleButtonFeatureNames>);
		if (multiButtonFeatureNames === undefined) return;
		const featureButtons = featureToMultiButtonsMap.get(multiButtonFeatureNames) || [];
		if (featureButtons.includes(buttonName)) {
			if (!multiButtonChanges[multiButtonFeatureNames]) {
				multiButtonChanges[multiButtonFeatureNames] = {};
			}
			// eslint-disable-next-line prefer-destructuring
			multiButtonChanges[multiButtonFeatureNames]![buttonName as keyof FeatureToMultiButtonMap[typeof multiButtonFeatureNames]] =
				changes.buttonPlacement[buttonName as keyof FeatureToMultiButtonMap[typeof multiButtonFeatureNames]];
		}
	});

	return { multiButtonChanges: multiButtonChanges as MultiButtonChange, singleButtonChanges: singleButtonChanges as SingleButtonChange };
}
export function isButtonSelectDisabled(buttonName: AllButtonNames, settings: configuration) {
	switch (buttonName) {
		case "volumeBoostButton": {
			return settings.volume_boost_mode === "global" || settings[buttonNameToSettingName[buttonName]] === false;
		}
		default: {
			const { [buttonName]: settingName } = buttonNameToSettingName;
			return settings[settingName] === false;
		}
	}
}
export function isNewYouTubeVideoLayout(): boolean {
	// Check for the class in the new layout
	const newLayoutElement = document.querySelector("ytd-player.ytd-watch-grid");

	if (newLayoutElement) {
		return true; // It's the new layout
	} else {
		return false; // It's the old layout
	}
}
export function getFormattedTimestamp() {
	const now = new Date();

	const month = (now.getMonth() + 1).toString().padStart(2, "0");
	const day = now.getDate().toString().padStart(2, "0");
	const year = now.getFullYear().toString().substr(-2);
	const hours = now.getHours();
	const minutes = now.getMinutes().toString().padStart(2, "0");
	const seconds = now.getSeconds().toString().padStart(2, "0");
	const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

	const period = hours >= 12 ? "PM" : "AM";
	const paddedHours = (hours % 12 || 12).toString().padStart(2, "0"); // Convert to 12-hour format and handle midnight (0 hours)

	return `${month}/${day}/${year} ${paddedHours}:${minutes}:${seconds}:${milliseconds} ${period}`;
}
/**
 * Parses an ISO 8601 duration string and returns the total number of seconds.
 *
 * @param {string} duration - The ISO 8601 duration string to parse.
 * @return {number} The total number of seconds represented by the duration string.
 */
export function parseISO8601Duration(duration: string): number {
	// Regular expression to match ISO 8601 duration format
	const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
	// Extract hours, minutes, and seconds from the duration string
	const matches = regex.exec(duration);
	// If the duration string does not match the expected format, return 0
	if (!matches) return 0;

	// Parse the hours, minutes, and seconds from the matches array
	const hours = parseInt(matches[1] || "0", 10);
	const minutes = parseInt(matches[2] || "0", 10);
	const seconds = parseInt(matches[3] || "0", 10);

	// Calculate the total number of seconds by multiplying hours, minutes, and seconds
	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats a duration in seconds into a string representation.
 *
 * @param {number} seconds - The duration in seconds.
 * @return {string} The formatted duration string in the format "HHhMMmSSs".
 */
export function formatDuration(seconds: number): string {
	// Calculate the hours, minutes, and seconds
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	// Format the hours, minutes, and seconds with leading zeros
	const formattedHours = hours.toString();
	const formattedMinutes = minutes.toString().padStart(2, "0");
	const formattedSeconds = secs.toString().padStart(2, "0");

	// Combine the formatted values into a single string
	return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
export function timeStringToSeconds(timeString: string): number {
	const parts = timeString.split(":").reverse();
	let seconds = 0;
	for (let i = 0; i < parts.length; i++) {
		seconds += parseInt(parts[i], 10) * Math.pow(60, i);
	}
	return seconds;
}
