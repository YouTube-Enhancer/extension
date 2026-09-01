import type { FeatureKeys } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getFeatureButton } from "@/src/features/buttonController";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { type MessageMappings, type Nullable, type YouTubePlayerDiv, youtubePlayerMaxSpeed, youtubePlayerMinSpeed } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { type ModifyElementAction, modifyElementClassList } from "@/src/utils/dom/classList";
import { preventScroll } from "@/src/utils/dom/events";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { clamp, round, toDivisible } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { createWheelStepper, type WheelStepper } from "./stepper";

export type ScrollWheelControlType = "speed" | "volume";

type ControlRuntime = {
	applyQueue: Promise<void>;
	playerContainer: YouTubePlayerDiv;
	stepper: WheelStepper;
};
type OptionsData = MessageMappings["options"]["response"];

const CONTEXT_MENU_HIDE_TIMEOUT = 100;
const controlFeatureIds: Record<ScrollWheelControlType, FeatureKeys> = {
	speed: "scrollWheelSpeedControl",
	volume: "scrollWheelVolumeControl"
};
const activeControls = new Map<ScrollWheelControlType, ControlRuntime>();
let optionsData: Nullable<OptionsData> = null;
let suppressContextMenu = false;

export function disableScrollWheelControl(type: ScrollWheelControlType) {
	activeControls.get(type)?.stepper.cancel();
	activeControls.delete(type);
	if (type === "volume") {
		modifyElementClassList("remove", { className: "yte-scroll-wheel-volume-control", element: document.body });
		toggleContextMenuVisibility("remove");
		suppressContextMenu = false;
	}
	if (activeControls.size === 0) eventManager.removeEventListeners("scrollWheelController");
}

export async function enableScrollWheelControl(type: ScrollWheelControlType) {
	optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const playerContainer = await findPlayerContainer(type);
	if (!playerContainer) {
		disableScrollWheelControl(type);
		return;
	}
	const existing = activeControls.get(type);
	if (existing) {
		existing.playerContainer = playerContainer;
	} else {
		activeControls.set(type, {
			applyQueue: Promise.resolve(),
			playerContainer,
			stepper: createWheelStepper((steps) => queueSteps(type, steps))
		});
	}
	attachWheelListeners(playerContainer);
	if (type === "volume") {
		eventManager.addEventListener(document.documentElement, "contextmenu", onContextMenu, "scrollWheelController");
		eventManager.addEventListener(document.documentElement, "mouseup", onMouseUp, "scrollWheelController");
		modifyElementClassList("add", { className: "yte-scroll-wheel-volume-control", element: document.body });
	}
}

export async function refreshScrollWheelOptions() {
	optionsData = await waitForSpecificMessage("options", "request_data", "content");
}

async function applySpeedSteps(runtime: ControlRuntime, steps: number, options: OptionsData) {
	const {
		data: {
			options: {
				onScreenDisplay,
				playbackSpeedButtons: { speed: speedPerClick },
				scrollWheelSpeedControl: { steps: speedStep }
			}
		}
	} = options;
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const newSpeed = round(clamp(videoElement.playbackRate + steps * speedStep, youtubePlayerMinSpeed, youtubePlayerMaxSpeed), 2);
	if (newSpeed === videoElement.playbackRate) return;
	await setPlayerSpeed(newSpeed);
	await updatePlaybackSpeedButtonTooltips(newSpeed, speedPerClick);
	showOnScreenDisplay(onScreenDisplay, runtime.playerContainer, { max: youtubePlayerMaxSpeed, type: "speed", value: newSpeed });
}

async function applyVolumeSteps(runtime: ControlRuntime, steps: number, options: OptionsData) {
	const {
		data: {
			options: {
				onScreenDisplay,
				scrollWheelVolumeControl: { steps: volumeStep }
			}
		}
	} = options;
	const { playerContainer } = runtime;
	if (!playerContainer.getVolume || !playerContainer.setVolume || !playerContainer.isMuted || !playerContainer.unMute) return;
	const [volume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
	const newVolume = clamp(toDivisible(volume + steps * volumeStep, volumeStep), 0, 100);
	await playerContainer.setVolume(newVolume);
	if (isMuted) await playerContainer.unMute();
	showOnScreenDisplay(onScreenDisplay, playerContainer, { max: 100, type: "volume", value: newVolume });
}

function attachWheelListeners(playerContainer: YouTubePlayerDiv) {
	const containerSelectors = ["div#player", isShortsPage() ? "#player-container:has(#shorts-player)" : "#player-container:has(#movie_player)"];
	const targets = new Set<HTMLElement>(document.querySelectorAll<HTMLElement>(containerSelectors.join(", ")));
	targets.add(playerContainer);
	for (const target of targets) {
		eventManager.addEventListener(target, "wheel", onWheel, "scrollWheelController", { passive: false });
	}
}

async function findPlayerContainer(type: ScrollWheelControlType): Promise<Nullable<YouTubePlayerDiv>> {
	let playerContainer: Nullable<YouTubePlayerDiv> = null;
	const findPlayerTask = (): boolean => {
		const element =
			isWatchPage() || (type === "volume" && isLivePage()) ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
		if (element) playerContainer = element;
		return playerContainer !== null;
	};
	await registry.playerManager.executeWithRetries(controlFeatureIds[type], [findPlayerTask], ["find player"], {
		maxAttempts: 15,
		pageTypes: type === "volume" ? ["watch", "live", "shorts"] : ["watch", "shorts"],
		waitForLoaded: false
	});
	return playerContainer;
}

function onContextMenu(event: MouseEvent) {
	if (!suppressContextMenu) return;
	const volumeControl = activeControls.get("volume");
	if (!volumeControl?.playerContainer.contains(event.target as Node)) return;
	event.preventDefault();
	event.stopImmediatePropagation();
	toggleContextMenuVisibility("remove");
	suppressContextMenu = false;
}

function onMouseUp(event: MouseEvent) {
	if (!suppressContextMenu) return;
	const volumeControl = activeControls.get("volume");
	if (!volumeControl?.playerContainer.contains(event.target as Node)) return;
	setTimeout(() => {
		suppressContextMenu = false;
		toggleContextMenuVisibility("remove");
	}, CONTEXT_MENU_HIDE_TIMEOUT);
}

function onWheel(event: WheelEvent) {
	const volumeBoostButton = getFeatureButton("volumeBoostButton");
	if (volumeBoostButton && event.target === volumeBoostButton) return;
	const settingsPanelMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
	if (settingsPanelMenu?.contains(event.target as Node)) return;
	if (!optionsData) return;
	const {
		data: {
			options: {
				scrollWheelSpeedControl: { enabled: speedEnabledInOptions, modifierKey: speedModifierKey },
				scrollWheelVolumeControl: { holdModifierKey: volumeHoldModifierKey, holdRightClick: volumeHoldRightClick, modifierKey: volumeModifierKey }
			}
		}
	} = optionsData;
	const volumeControl = activeControls.get("volume");
	let type: Nullable<ScrollWheelControlType> = null;
	if (speedEnabledInOptions && event[speedModifierKey]) {
		// The volume control always yields to the speed control's modifier.
		if (!activeControls.has("speed")) return;
		type = "speed";
	} else if (volumeControl && (!volumeHoldModifierKey || event[volumeModifierKey]) && (!volumeHoldRightClick || event.buttons === 2)) {
		type = "volume";
	}
	if (!type) return;
	if (type === "volume" && volumeHoldRightClick) {
		toggleContextMenuVisibility("add");
		suppressContextMenu = true;
	}
	preventScroll(event);
	activeControls.get(type)?.stepper.feed(event);
}

function queueSteps(type: ScrollWheelControlType, wheelSteps: number) {
	const runtime = activeControls.get(type);
	if (!runtime || !optionsData) return;
	// Wheel-down is positive, but scrolling down should decrease the value.
	const steps = -wheelSteps;
	const options = optionsData;
	runtime.applyQueue = runtime.applyQueue
		.then(() => (type === "volume" ? applyVolumeSteps(runtime, steps, options) : applySpeedSteps(runtime, steps, options)))
		.catch(() => {});
}

function showOnScreenDisplay(
	onScreenDisplay: OptionsData["data"]["options"]["onScreenDisplay"],
	playerContainer: YouTubePlayerDiv,
	displayValue: { max: number; type: "speed" | "volume"; value: number }
) {
	const { color, hideTime, opacity, padding, position, type } = onScreenDisplay;
	new OnScreenDisplayManager(
		{
			displayColor: color,
			displayHideTime: hideTime,
			displayOpacity: opacity,
			displayPadding: padding,
			displayPosition: position,
			displayType: type,
			playerContainer
		},
		"yte-osd",
		displayValue
	);
}

function toggleContextMenuVisibility(action: ModifyElementAction) {
	modifyElementClassList(action, { className: "yte-context-menu-visible", element: document.body });
}
