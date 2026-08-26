import type { Nullable } from "@/src/types";

import { clamp } from "@/src/utils/math";

/**
 * Pure logic for the mini player seek bar.
 *
 * Nothing in this file may touch the DOM, timers, or page globals — it is the
 * unit-testable core behind `attachMiniSeekBar`.
 */
export type BarVisibilityInput = {
	controlsVisible: boolean;
	forced: boolean;
	scrubbing: boolean;
};
export type SeekWindow = {
	end: number;
	start: number;
};
export type StoryboardRenderer = {
	fineScrubbingRecommendedLevel?: number;
	highResolutionRecommendedLevel?: number;
	recommendedLevel?: number;
	spec?: string;
};
export type StoryboardSheet = {
	baseUrl: string;
	cols: number;
	frameCount: number;
	height: number;
	level: number;
	rows: number;
	signature: string;
	width: number;
};
export type StoryboardTile = {
	backgroundHeight: number;
	backgroundWidth: number;
	height: number;
	offsetX: number;
	offsetY: number;
	url: string;
	width: number;
};
export type TimeRangesLike = {
	end(index: number): number;
	length: number;
	start(index: number): number;
};
export function buildStoryboardTileUrl(sheet: StoryboardSheet, imageIndex: number): string {
	let url = sheet.baseUrl.replace("$L", String(sheet.level)).replace("$N", `M${imageIndex}`);
	if (url.startsWith("//")) url = `https:${url}`;
	if (!/([?&])sigh=/.test(url)) {
		const join = url.includes("?") ? "&" : "?";
		url = `${url}${join}sigh=${encodeURIComponent(sheet.signature)}`;
	}
	return url;
}
export function computeSeekWindow({ duration, seekable }: { duration: number; seekable: Nullable<TimeRangesLike> }): Nullable<SeekWindow> {
	if (Number.isFinite(duration) && duration > 0) {
		return { end: duration, start: 0 };
	}
	try {
		if (seekable && seekable.length) {
			const start = seekable.start(0);
			const end = seekable.end(seekable.length - 1);
			if (Number.isFinite(start) && Number.isFinite(end) && end > start) return { end, start };
		}
	} catch {}
	return null;
}
export function formatTime(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	const hh = Math.floor(s / 3600);
	const mm = Math.floor((s % 3600) / 60);
	const ss = s % 60;
	return hh > 0 ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
}
export function isBarHidden({ controlsVisible, forced, scrubbing }: BarVisibilityInput): boolean {
	return !controlsVisible && !forced && !scrubbing;
}
export function parseStoryboardSheet(renderer: Nullable<StoryboardRenderer>): Nullable<StoryboardSheet> {
	if (!renderer?.spec) return null;
	try {
		const parts = renderer.spec.split("|");
		const [baseUrl] = parts;
		const layer = parts.at(-1);
		if (!baseUrl || !layer || layer === baseUrl) return null;
		const [w, h, count, c, r, _a, _b, signature] = layer.split("#");
		const width = parseInt(w, 10);
		const height = parseInt(h, 10);
		const frameCount = parseInt(count, 10);
		const cols = parseInt(c, 10);
		const rows = parseInt(r, 10);
		if (![width, height, frameCount, cols, rows].every(Number.isFinite)) return null;
		if (!signature) return null;
		return {
			baseUrl,
			cols,
			frameCount,
			height,
			level: preferredStoryboardLevel(renderer),
			rows,
			signature,
			width
		};
	} catch {
		return null;
	}
}
export function ratioToTime(window: SeekWindow, ratio: number): number {
	return window.start + (window.end - window.start) * clamp(ratio, 0, 1);
}
export function storyboardTileAt(
	sheet: StoryboardSheet,
	timeRatio: number,
	videoAspect: number,
	max: { height: number; width: number } = { height: 90, width: 160 }
): StoryboardTile {
	const frameIndex = Math.floor(clamp(timeRatio, 0, 1) * Math.max(1, sheet.frameCount - 1));
	const framesPerImage = sheet.cols * sheet.rows;
	const imageIndex = Math.floor(frameIndex / framesPerImage);
	const withinImage = frameIndex % framesPerImage;
	const row = Math.floor(withinImage / sheet.cols);
	const col = withinImage % sheet.cols;
	let { width } = max;
	let { height } = max;
	if (videoAspect > 1) {
		height = Math.min(max.height, max.width / videoAspect);
	} else {
		width = Math.min(max.width, max.height * videoAspect);
	}
	const scale = Math.min(width / sheet.width, height / sheet.height);
	return {
		backgroundHeight: sheet.rows * sheet.height * scale,
		backgroundWidth: sheet.cols * sheet.width * scale,
		height,
		offsetX: col * sheet.width * scale,
		offsetY: row * sheet.height * scale,
		url: buildStoryboardTileUrl(sheet, imageIndex),
		width
	};
}
export function timeToRatio(window: SeekWindow, time: number): number {
	const range = window.end - window.start;
	if (range <= 0) return 0;
	return clamp((time - window.start) / range, 0, 1);
}
function preferredStoryboardLevel(renderer: StoryboardRenderer): number {
	const recommended = renderer.highResolutionRecommendedLevel ?? renderer.recommendedLevel ?? renderer.fineScrubbingRecommendedLevel;
	return Number.isFinite(recommended) ? (recommended as number) : 3;
}
