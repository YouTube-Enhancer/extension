import type { IconType } from "react-icons";

import React from "react";
import { LuClock } from "react-icons/lu";

import { waitForElement } from "@/src/utils/dom/wait";

// Catalog of icons that YouTube renders on the page.
// Each entry has a selector for the native svg and a fallback icon.
const YOUTUBE_ICON_CATALOG = {
	// The "Watch later" entry icon in the guide sidebar.
	// Every guide entry link has id="endpoint". The href narrows the match to the correct entry.
	watchLater: {
		fallback: LuClock,
		selector: 'a#endpoint[href="/playlist?list=WL"] yt-icon svg'
	}
} as const satisfies Record<string, { fallback: IconType; selector: string }>;

export type YouTubeIconName = keyof typeof YOUTUBE_ICON_CATALOG;

// Reuse an icon that YouTube renders on the page.
// Return the catalog fallback when the selector does not match an svg in time.
export async function getYouTubeIcon(icon: YouTubeIconName, timeout = 150): Promise<IconType> {
	const {
		[icon]: { fallback, selector }
	} = YOUTUBE_ICON_CATALOG;
	const svg = await waitForElement<SVGElement>(selector, timeout, "optional");
	return svg ? createIconFromSvg(svg) : fallback;
}

function createIconFromSvg(svg: SVGElement): IconType {
	const { innerHTML: markup } = svg;
	const viewBox = svg.getAttribute("viewBox") ?? "0 0 24 24";
	return ({ color, size }) =>
		React.createElement("svg", { dangerouslySetInnerHTML: { __html: markup }, fill: color, height: size, viewBox, width: size });
}
