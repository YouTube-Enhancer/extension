import type { Nullable } from "@/src/types";

import { formatVideoTimestamp, type VideoTimestampFormat } from "./time";

export const screenshotFilenamePlaceholders = [
	"{channel id}",
	"{channel name}",
	"{chapter name}",
	"{date}",
	"{extension}",
	"{resolution}",
	"{video id}",
	"{video timestamp}"
] as const;
export type ScreenshotFilenameContext = {
	channelId: string;
	channelName: string;
	chapterName: string;
	date: string;
	extension: string;
	resolution: string;
	videoId: string;
	videoTimestamp: string;
};

export type ScreenshotFilenamePlaceholder = (typeof screenshotFilenamePlaceholders)[number];

const placeholderToContextKey = {
	"{channel id}": "channelId",
	"{channel name}": "channelName",
	"{chapter name}": "chapterName",
	"{date}": "date",
	"{extension}": "extension",
	"{resolution}": "resolution",
	"{video id}": "videoId",
	"{video timestamp}": "videoTimestamp"
} as const satisfies Record<ScreenshotFilenamePlaceholder, keyof ScreenshotFilenameContext>;

export const defaultScreenshotFilenameTemplate = "Screenshot-{video id}-{date}";

export const screenshotDateFormats = ["iso", "date", "dateTime", "dayMonthYear"] as const;
export type ScreenshotDateFormat = (typeof screenshotDateFormats)[number];

export const screenshotTimestampFormats = ["auto", "hhmmss", "mmss"] as const satisfies readonly VideoTimestampFormat[];
export type ScreenshotTimestampFormat = (typeof screenshotTimestampFormats)[number];

export const screenshotTimestampSeparators = ["auto", "colon", "hyphen"] as const;
export type ScreenshotTimestampSeparator = (typeof screenshotTimestampSeparators)[number];

const padDatePart = (value: number) => value.toString().padStart(2, "0");

/**
 * Returns the `{...}` tokens (and stray braces) in a template that are not valid placeholders.
 */
export function extractInvalidPlaceholders(template: string): string[] {
	const validPlaceholders = new Set<string>(screenshotFilenamePlaceholders);
	const invalid = new Set<string>();
	for (const match of template.matchAll(/\{[^{}]*\}/g)) {
		if (!validPlaceholders.has(match[0])) invalid.add(match[0]);
	}
	const unmatchedBraces = template.replace(/\{[^{}]*\}/g, "").match(/[{}]/g);
	if (unmatchedBraces) {
		for (const brace of unmatchedBraces) invalid.add(brace);
	}
	return [...invalid].sort();
}

/**
 * Formats the current date for use in a screenshot file name. All formats are file-name safe.
 */
export function formatScreenshotDate(date: Date, format: ScreenshotDateFormat = "iso"): string {
	const year = date.getFullYear().toString();
	const month = padDatePart(date.getMonth() + 1);
	const day = padDatePart(date.getDate());
	const hours = padDatePart(date.getHours());
	const minutes = padDatePart(date.getMinutes());
	const seconds = padDatePart(date.getSeconds());
	switch (format) {
		case "date":
			return `${year}-${month}-${day}`;
		case "dateTime":
			return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
		case "dayMonthYear":
			return `${day}-${month}-${year}`;
		case "iso":
			return date.toISOString().replace(/[:.]/g, "-");
	}
}

/**
 * Formats seconds since the start of the video for use in a screenshot file name.
 * @param separator "auto" uses hyphens on Windows (where ":" is invalid in file names) and colons everywhere else.
 */
export function formatScreenshotTimestamp(
	seconds: number,
	format: ScreenshotTimestampFormat = "auto",
	separator: ScreenshotTimestampSeparator = "auto"
): string {
	return formatVideoTimestamp(seconds, format).replace(/:/g, resolveTimestampSeparator(separator));
}

/**
 * Removes any placeholder tokens and stray braces that are not valid placeholders.
 */
export function removeInvalidPlaceholders(template: string): string {
	return template.replace(/\{[^{}]*\}/g, "").replace(/[{}]/g, "");
}

/**
 * Replaces known placeholders in the template with their runtime values. Placeholders whose
 * value could not be determined resolve to an empty string. Returns null if the resulting
 * name is empty.
 */
export function resolveFilenameTemplate(template: string, context: ScreenshotFilenameContext): Nullable<string> {
	let name = template;
	for (const placeholder of screenshotFilenamePlaceholders) {
		name = name.split(placeholder).join(context[placeholderToContextKey[placeholder]] ?? "");
	}
	// Catch-all: drop any remaining placeholder tokens and stray braces (e.g. from legacy or invalid settings)
	name = removeInvalidPlaceholders(name);
	const sanitized = sanitizeFilename(name).trim();
	if (!sanitized) return null;
	return sanitized;
}

/**
 * Replaces placeholder characters that are not allowed in file names.
 */
export function sanitizeFilename(name: string): string {
	// eslint-disable-next-line no-control-regex
	return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
}

function isWindowsPlatform(): boolean {
	if (typeof navigator === "undefined") return false;
	return /win/i.test(navigator.platform) || /windows/i.test(navigator.userAgent);
}

function resolveTimestampSeparator(separator: ScreenshotTimestampSeparator): "-" | ":" {
	if (separator === "colon") return ":";
	if (separator === "hyphen") return "-";
	// "auto": use hyphens on Windows (colons aren't allowed in file names there), colons elsewhere
	return isWindowsPlatform() ? "-" : ":";
}
