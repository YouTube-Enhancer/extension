import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";

import { metadata } from "./index.metadata";

let { jumpBy: jumpByTime } = featureConfigManager.getLastOr(
	"customSeekDuration",
	metadata.defaults
);

const { id: customSeekId } = metadata;

function addKeyListener() {
	eventManager.addEventListener(document, "keydown", blockNativeSeek, customSeekId, true);
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
	},
	onEnable: () => {
		addKeyListener();
	}
});
