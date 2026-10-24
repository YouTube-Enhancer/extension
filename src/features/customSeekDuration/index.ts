import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { getOSDConfig, showOSD } from "@/src/utils/osd";
import { isShortsPage } from "@/src/utils/url";

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
let osdAnimationFrame: null | number = null;
let osdAccumulationTimeout: null | number = null;

function manageOSD(direction: "backward" | "forward") {
	pendingOSDJump += direction === "forward" ? jumpByTime : -jumpByTime;
	if (osdAccumulationTimeout !== null) {
		window.clearTimeout(osdAccumulationTimeout);
	}
	osdAccumulationTimeout = window.setTimeout(() => {
		osdAccumulationTimeout = null;
		pendingOSDJump = 0;
	}, OSD_ACCUMULATION_TIMEOUT);
	if (osdAnimationFrame !== null) return;

	osdAnimationFrame = requestAnimationFrame(() => {
		osdAnimationFrame = null;
		const jumpAmount = pendingOSDJump;
		if (jumpAmount === 0) return;

		const onScreenDisplay = getOSDConfig();
		if (!onScreenDisplay) return;

		const displayValue = { max: jumpByTime, type: "seek" as const, value: jumpAmount };

		const playerContainer = document.querySelector<HTMLDivElement>("div#movie_player");
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		const videoParentDiv = video?.parentElement;

		const preferred = isShortsPage() ? videoParentDiv : playerContainer;
		const fallback = isShortsPage() ? playerContainer : videoParentDiv;
		const target = (preferred ?? fallback) as null | YouTubePlayerDiv;
		if (target instanceof HTMLDivElement) {
			showOSD(
				onScreenDisplay,
				target,
				displayValue,
				"text",
				jumpAmount > 0 ? "center_right" : "center_left"
			);
		}
	});
}

const seekArrowKeys = ["ArrowLeft", "ArrowRight"];
function blockNativeSeek(event: KeyboardEvent) {
	const video = document.querySelector("video");
	if (!video) return;

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

	// standard UI roles that require arrow keys for navigation
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

	// We check the all nodes to catch roles applied to parent container divs
	for (let i = 0; i < path.length; i++) {
		const { [i]: node } = path;

		if (isElement(node)) {
			const role = node.getAttribute("role") ?? "";

			if (interactiveRoles.includes(role)) {
				// EXCEPTION: The YouTube timeline progress bar exposes the slider role, but native seeking
				// must remain blocked to avoid conflicting with the custom seek handler.
				if (
					node.classList &&
					(node.classList.contains("ytp-progress-bar") ||
						node.classList.contains("ytp-progress-bar-container"))
				) {
					break;
				}
				return;
			}
		}
	}

	event.stopImmediatePropagation();
	event.preventDefault();
	seekHandler(event.key === "ArrowLeft" ? "backward" : "forward");
}

function isElement(target: EventTarget | undefined): target is Element {
	return target instanceof Element;
}

function removeKeyListener() {
	eventManager.removeEventListener(document, "keydown", customSeekId);
}

function seekHandler(direction: "backward" | "forward") {
	const playerElement = document.querySelector<HTMLElement>("#movie_player");
	const videoElement = playerElement?.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;

	const jumpAmount = direction === "forward" ? jumpByTime : -jumpByTime;
	videoElement.currentTime = timelineBoundardCheck(
		videoElement.duration,
		videoElement.currentTime + jumpAmount
	);
	manageOSD(direction);
}

function timelineBoundardCheck(videoMaxDuration: number, playbackTime: number) {
	if (playbackTime > videoMaxDuration) {
		return videoMaxDuration;
	}
	if (playbackTime < 0) {
		return 0;
	}
	return playbackTime;
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
	},
	onEnable: () => {
		addKeyListener();
	}
});
