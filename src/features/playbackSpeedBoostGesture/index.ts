import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { round } from "@/src/utils/math";
import { getOSDConfig, showOSD } from "@/src/utils/osd";
import { getMinSpeed } from "@/src/utils/speed";
import { isShortsPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

interface ActiveGesture {
	generation: number;
	hasMoved: boolean;
	initialSpeed: number;
	lastAppliedSpeed: number;
	startX: number;
}

const DISPLACEMENT_INTERVAL = 10;
const MAX_SPEED = 16;

const {
	defaults: { speed: defaultGestureSpeed }
} = metadata;

let activeGesture: ActiveGesture | null = null;
let gestureGeneration = 0;
let gestureSpeed = defaultGestureSpeed;
let preventNextClick = false;
let preventNextClickTimeout: null | number = null;
let pendingRestorationSpeed: null | number = null;
let pendingOSDSpeed: null | number = null;
let osdAnimationFrame: null | number = null;
let speedUpdateQueue = Promise.resolve();

/** Attaches the document and window listeners that drive the drag gesture, all scoped to this feature's id. */
function addGestureListeners() {
	eventManager.addEventListener(document, "mousedown", handleMouseDown, metadata.id, true);
	eventManager.addEventListener(document, "mousemove", handleMouseMove, metadata.id);
	eventManager.addEventListener(document, "mouseup", handleMouseUp, metadata.id);
	eventManager.addEventListener(document, "mouseleave", handleMouseUp, metadata.id);
	eventManager.addEventListener(document, "click", stopGestureClick, metadata.id, true);
	eventManager.addEventListener(window, "blur", () => handleMouseUp(), metadata.id);
}

/**
 * Returns the player element the event landed on, or null when the event is outside the player or over a
 * surface the gesture should not capture (controls chrome, end screens).
 */
function getPlayerTarget(event: MouseEvent): Element | null {
	const { target } = event;
	if (!(target instanceof Element)) return null;
	if (
		Element.prototype.closest.call(
			target,
			".ytp-chrome-bottom, .ytp-chrome-top, .ytp-ce-element, .ytp-popup, .ytp-settings-menu"
		)
	)
		return null;
	if (target instanceof HTMLVideoElement) return target;
	return Element.prototype.closest.call(target, ".html5-video-player, .ytp-player-content");
}

/**
 * Starts a gesture on left mousedown over the player: snapshots the current playback rate as the baseline
 * and the pointer's x position.
 */
function handleMouseDown(event: MouseEvent) {
	if (event.button !== 0 || !getPlayerTarget(event)) return;
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;

	const currentSpeed = pendingRestorationSpeed ?? video.playbackRate;
	pendingRestorationSpeed = null;
	gestureGeneration++;
	activeGesture = {
		generation: gestureGeneration,
		hasMoved: false,
		initialSpeed: currentSpeed,
		lastAppliedSpeed: currentSpeed,
		startX: event.clientX
	};
}

/**
 * Maps horizontal pointer displacement to a playback rate while a gesture is active: one speed step per
 * DISPLACEMENT_INTERVAL pixels, clamped between the feature's floor and MAX_SPEED, with an OSD readout.
 */
function handleMouseMove(event: MouseEvent) {
	if (!activeGesture || event.buttons === 0) return;
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;

	const { generation, initialSpeed, lastAppliedSpeed, startX } = activeGesture;
	const displacement = event.clientX - startX;
	const segments = Math.trunc(displacement / DISPLACEMENT_INTERVAL);
	const speedAdjustment = segments * gestureSpeed;
	const minSpeed =
		segments < 0 ? Math.min(getMinSpeed(gestureSpeed), initialSpeed) : getMinSpeed(gestureSpeed);
	const newSpeed = round(
		Math.min(MAX_SPEED, Math.max(minSpeed, initialSpeed + speedAdjustment)),
		2
	);
	if (newSpeed === lastAppliedSpeed) return;

	activeGesture.lastAppliedSpeed = newSpeed;
	activeGesture.hasMoved = true;

	manageOSD(newSpeed);

	queueSpeedUpdate(newSpeed, generation);
}

/**
 * Ends the active gesture: clears the gesture state, marks that the trailing click should be suppressed if
 * the pointer actually moved, and queues a revert to the pre-gesture speed.
 */
function handleMouseUp(event?: MouseEvent, showRevertOSD = true) {
	if (!activeGesture) return;

	const { hasMoved, initialSpeed } = activeGesture;
	if (hasMoved && Boolean(event && getPlayerTarget(event))) {
		preventNextClick = true;
		if (preventNextClickTimeout !== null) clearTimeout(preventNextClickTimeout);
		preventNextClickTimeout = window.setTimeout(() => {
			preventNextClick = false;
			preventNextClickTimeout = null;
		}, 100);
	}
	activeGesture = null;
	gestureGeneration++;
	if (hasMoved) {
		pendingRestorationSpeed = initialSpeed;
		if (showRevertOSD) manageOSD(initialSpeed);
		queueSpeedUpdate(initialSpeed, gestureGeneration, true);
	}
}

/**
 * Coalesces rapid speed changes into one OSD update per animation frame, avoiding repeated canvas setup during
 * fast pointer movement while ensuring the latest speed is displayed.
 */
function manageOSD(speed: number) {
	pendingOSDSpeed = speed;
	if (osdAnimationFrame !== null) return;

	osdAnimationFrame = requestAnimationFrame(() => {
		osdAnimationFrame = null;
		const displaySpeed = pendingOSDSpeed;
		pendingOSDSpeed = null;
		if (displaySpeed === null) return;

		const onScreenDisplay = getOSDConfig();
		if (!onScreenDisplay) return;

		const displayValue = { max: MAX_SPEED, type: "speed" as const, value: displaySpeed };

		const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		const videoParentDiv = video?.parentElement;

		const preferred = isShortsPage() ? videoParentDiv : playerContainer;
		const fallback = isShortsPage() ? playerContainer : videoParentDiv;
		const target = (preferred ?? fallback) as null | YouTubePlayerDiv;
		if (target instanceof HTMLDivElement) {
			showOSD(onScreenDisplay, target, displayValue, "text");
		}
	});
}

/**
 * Serializes playback-rate writes onto a single promise chain so they apply in order, and drops any write
 * whose gesture generation is no longer current (a newer mousedown or mouseup superseded it).
 */
function queueSpeedUpdate(speed: number, generation: number, preserve = false) {
	speedUpdateQueue = speedUpdateQueue
		.catch(() => undefined)
		.then(async () => {
			if (!preserve && generation !== gestureGeneration) return undefined;
			await setPlayerSpeed(speed);
			return undefined;
		})
		.catch((error) => {
			console.error("[playbackSpeedBoostGesture] Failed to set playback speed:", error);
		});
}

/** Detaches every listener this feature registered and ends any gesture still in progress. */
function removeGestureListeners() {
	eventManager.removeEventListeners(metadata.id);
	handleMouseUp(undefined, false);
	if (preventNextClickTimeout !== null) {
		clearTimeout(preventNextClickTimeout);
		preventNextClickTimeout = null;
	}
	preventNextClick = false;
	if (osdAnimationFrame !== null) {
		cancelAnimationFrame(osdAnimationFrame);
		osdAnimationFrame = null;
	}
	pendingOSDSpeed = null;
}

/**
 * Suppresses the click that trails a completed drag so it does not also toggle playback; only consumed
 * when the click lands on the player surface.
 */
function stopGestureClick(event: MouseEvent) {
	if (!preventNextClick) return;

	const isPlayerTarget = Boolean(getPlayerTarget(event));
	preventNextClick = false;
	if (preventNextClickTimeout !== null) {
		clearTimeout(preventNextClickTimeout);
		preventNextClickTimeout = null;
	}
	if (!isPlayerTarget) return;

	event.preventDefault();
	event.stopImmediatePropagation();
}

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		gestureSpeed = config.speed;
	},
	onDisable: removeGestureListeners,
	onEnable: (config) => {
		gestureSpeed = config.speed;
		addGestureListeners();
	},
	onNavigate: () => {
		handleMouseUp();
	}
});
