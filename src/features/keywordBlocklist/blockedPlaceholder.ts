import type { Nullable } from "@/src/types";

const BACKGROUND_COLOR = "#0f0f0f";
const ICON_COLOR = "#ff0033";
const DATA_URI_PREFIX = "data:image/svg+xml;charset=utf-8,";

export const BLOCKED_THUMBNAIL_URL = createBlockedPlaceholderDataUri(320, 180);
export const BLOCKED_AVATAR_URL = createBlockedPlaceholderDataUri(160, 160);

/** True when a src or CSS background-image value is one of the generated placeholders. */
export function isBlockedPlaceholderUrl(value: Nullable<string> | undefined): boolean {
	return typeof value === "string" && value.includes(DATA_URI_PREFIX);
}

function createBlockedPlaceholderDataUri(width: number, height: number): string {
	const size = Math.min(width, height);
	const cx = width / 2;
	const cy = height / 2;
	const radius = size * 0.26;
	const strokeWidth = radius * 0.24;
	const offset = radius * Math.SQRT1_2;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${BACKGROUND_COLOR}"/><circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${ICON_COLOR}" stroke-width="${strokeWidth}"/><line x1="${cx - offset}" y1="${cy - offset}" x2="${cx + offset}" y2="${cy + offset}" stroke="${ICON_COLOR}" stroke-width="${strokeWidth}" stroke-linecap="round"/></svg>`;
	return `${DATA_URI_PREFIX}${encodeURIComponent(svg)}`;
}
