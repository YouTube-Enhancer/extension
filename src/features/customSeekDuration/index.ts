import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { clamp } from "@/src/utils/math";
import { getOSDConfig, showOSD } from "@/src/utils/osd";

import { metadata } from "./index.metadata";

let { jumpBy: jumpByTime } = featureConfigManager.getLastOr(
	"customSeekDuration",
	metadata.defaults
);

const { id: customSeekId } = metadata;
const OSD_ACCUMULATION_TIMEOUT = 800;

function addKeyListener() {
	eventManager.addEventListener(document, "keydown", blockNativeSeek, customSeekId, true);
}

let pendingOSDJump = 0;
let pendingOSDVideo: HTMLVideoElement | null = null;
let osdAnimationFrame: null | number = null;
let osdAccumulationTimeout: null | number = null;
let lastDirection: Nullable<"backward" | "forward"> = null;

const seekArrowKeys = ["ArrowLeft", "ArrowRight"];
const interactiveRoles = [
	"slider",
	"menuitem",
	"menuitemradio",
	"menuitemcheckbox",
	"tab",
	"spinbutton",
	"listbox",
	"combobox",
	"treeitem",
	"radio"
];

function blockNativeSeek(event: KeyboardEvent) {
	if (!seekArrowKeys.includes(event.key)) return;

	// Exclude modifier-key events before intercepting the arrow keys.
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

	const path = event.composedPath();
	const [trueTarget] = path;
	if (!isElement(trueTarget)) return;
	const isContentEditable = trueTarget instanceof HTMLElement && trueTarget.isContentEditable;

	const tagName = trueTarget.tagName.toUpperCase();
	if (tagName === "INPUT" || tagName === "TEXTAREA" || isContentEditable) {
		return;
	}

	// We check all nodes to catch roles applied to parent container divs
	for (let i = 0; i < path.length; i++) {
		const { [i]: node } = path;

		if (isElement(node)) {
			const role = node.getAttribute("role") ?? "";

			if (interactiveRoles.includes(role)) {
				// EXCEPTION: The YouTube timeline progress bar exposes the slider role, but native seeking
				// must remain blocked to avoid conflicting with the custom seek handler.
				if (
					node.classList.contains("ytp-progress-bar") ||
					node.classList.contains("ytp-progress-bar-container")
				) {
					break;
				}
				return;
			}
		}
	}

	const videoElement = getVideoElement();
	if (!videoElement || !Number.isFinite(videoElement.duration) || videoElement.duration <= 0) {
		return;
	}

	event.stopImmediatePropagation();
	event.preventDefault();
	seekHandler(event.key === "ArrowLeft" ? "backward" : "forward", videoElement);
}

function getVideoElement(): Nullable<HTMLVideoElement> {
	const playerElement = document.querySelector<HTMLElement>("#movie_player");
	return playerElement?.querySelector<HTMLVideoElement>("video.html5-main-video") ?? null;
}

function isElement(target: EventTarget | undefined): target is Element {
	return target instanceof Element;
}

function manageOSD(actualJump: number, video: HTMLVideoElement) {
	pendingOSDVideo = video;
	pendingOSDJump += actualJump;
	if (osdAccumulationTimeout !== null) {
		window.clearTimeout(osdAccumulationTimeout);
	}
	osdAccumulationTimeout = window.setTimeout(() => {
		osdAccumulationTimeout = null;
		pendingOSDJump = 0;
		pendingOSDVideo = null;
	}, OSD_ACCUMULATION_TIMEOUT);
	if (osdAnimationFrame !== null) return;

	osdAnimationFrame = requestAnimationFrame(() => {
		osdAnimationFrame = null;
		const accumulatedJump = pendingOSDJump;
		const seekedVideo = pendingOSDVideo;
		if (accumulatedJump === 0 || !seekedVideo) return;

		const onScreenDisplay = getOSDConfig();
		if (!onScreenDisplay || onScreenDisplay.type === "no_display") return;

		// The display type is overridden to "text" below, which only formats `value` (e.g. `+10s`).
		// `max` is set to the accumulated jump magnitude to keep `value / max` in bounds if a non-text
		// display type (e.g., line or circle) is ever used.
		const displayValue = {
			max: Math.abs(accumulatedJump),
			type: "seek" as const,
			value: accumulatedJump
		};

		const { parentElement: videoParentDiv } = seekedVideo;

		const target = videoParentDiv as null | YouTubePlayerDiv;
		if (target instanceof HTMLDivElement) {
			showOSD(
				onScreenDisplay,
				target,
				displayValue,
				"text",
				accumulatedJump > 0 ? "center_right" : "center_left"
			);
		}
	});
}

function removeKeyListener() {
	eventManager.removeEventListener(document, "keydown", customSeekId);
}

function seekHandler(direction: "backward" | "forward", videoElement: HTMLVideoElement) {
	const { currentTime, duration, ended } = videoElement;

	// When HTML5 media ends, `video.ended` is true but `currentTime` can lag slightly
	// behind `duration` due to container frame rounding. Normalizing `baseTime` to `duration`
	// ensures forward seeks on an ended video evaluate `targetTime === baseTime` and no-op.
	const baseTime = ended && direction === "forward" ? duration : currentTime;
	const jumpAmount = direction === "forward" ? jumpByTime : -jumpByTime;
	const targetTime = clamp(baseTime + jumpAmount, 0, duration);
	if (targetTime === baseTime) return;
	const actualJump = Math.round(targetTime - baseTime);

	if (lastDirection !== direction) {
		pendingOSDJump = 0;
		lastDirection = direction;
	}

	videoElement.currentTime = targetTime;
	manageOSD(actualJump, videoElement);
}

export default createFeature({
	...metadata,
	onConfigChange: ({ jumpBy }) => {
		jumpByTime = jumpBy;
	},
	onDisable: () => {
		removeKeyListener();
		if (osdAccumulationTimeout !== null) {
			window.clearTimeout(osdAccumulationTimeout);
			osdAccumulationTimeout = null;
		}
		if (osdAnimationFrame !== null) {
			cancelAnimationFrame(osdAnimationFrame);
			osdAnimationFrame = null;
		}
		pendingOSDJump = 0;
		pendingOSDVideo = null;
		lastDirection = null;
	},
	onEnable: ({ jumpBy }) => {
		jumpByTime = jumpBy;
		addKeyListener();
	}
});
