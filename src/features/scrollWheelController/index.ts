import type { FeatureKeys } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getFeatureButtonId } from "@/src/features/buttonController";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import {
	type configuration,
	type MessageMappings,
	type ModifierKey,
	type Nullable,
	type YouTubePlayerDiv,
	youtubePlayerMaxSpeed,
	youtubePlayerMinSpeed
} from "@/src/types";
import { getOnScreenDisplayConfig } from "@/src/ui/onScreenDisplayConfigStore";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { type ModifyElementAction, modifyElementClassList } from "@/src/utils/dom/classList";
import { preventScroll } from "@/src/utils/dom/events";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { clamp, round, toDivisible } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { createWheelStepper, type WheelStepper } from "./stepper";

export type ScrollWheelControlType = "speed" | "volume";

type ControlConfigMap = {
	speed: configuration["scrollWheelSpeedControl"];
	volume: configuration["scrollWheelVolumeControl"];
};
type ControlRuntime = {
	applying: boolean;
	pendingSteps: number;
	playerContainer: YouTubePlayerDiv;
	stepper: WheelStepper;
};
type DispatchConfig = {
	speedEnabled: boolean;
	speedModifierKey: ModifierKey;
	volumeHoldModifierKey: boolean;
	volumeHoldRightClick: boolean;
	volumeModifierKey: ModifierKey;
};
type OptionsData = MessageMappings["options"]["response"];

const CONTEXT_MENU_HIDE_TIMEOUT = 100;
/**
 * The snapshot only seeds the cross-feature fallbacks and the disabled-speed yield rule. A short TTL lets the two
 * feature enables of one navigation share a single fetch.
 */
const SNAPSHOT_TTL_MS = 1000;
const controlFeatureIds: Record<ScrollWheelControlType, FeatureKeys> = {
	speed: "scrollWheelSpeedControl",
	volume: "scrollWheelVolumeControl"
};
const activeControls = new Map<ScrollWheelControlType, ControlRuntime>();
const controlConfigs: { [K in ScrollWheelControlType]: Nullable<ControlConfigMap[K]> } = { speed: null, volume: null };
let dispatchConfig: Nullable<DispatchConfig> = null;
let optionsSnapshot: Nullable<OptionsData> = null;
let optionsSnapshotFetch: Nullable<Promise<OptionsData>> = null;
let optionsSnapshotTime = 0;
let suppressContextMenu = false;

export function disableScrollWheelControl(type: ScrollWheelControlType) {
	activeControls.get(type)?.stepper.cancel();
	activeControls.delete(type);
	modifyElementClassList("remove", { className: `yte-scroll-wheel-${type}-control`, element: document.body });
	if (type === "volume") {
		toggleContextMenuVisibility("remove");
		suppressContextMenu = false;
		// The context-menu listeners are the volume control's alone; the wheel listener on the document stays for the other control.
		eventManager.removeEventListenersForTarget(document.documentElement, "scrollWheelController");
	}
	if (activeControls.size === 0) eventManager.removeEventListeners("scrollWheelController");
}

export async function enableScrollWheelControl<T extends ScrollWheelControlType>(type: T, config: ControlConfigMap[T]) {
	controlConfigs[type] = config;
	rebuildDispatchConfig();
	await ensureOptionsSnapshot();
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
			applying: false,
			pendingSteps: 0,
			playerContainer,
			stepper: createWheelStepper((steps) => queueSteps(type, steps))
		});
	}
	attachWheelListener();
	// Marks the body while a control is attached; the volume class also drives the context-menu CSS.
	modifyElementClassList("add", { className: `yte-scroll-wheel-${type}-control`, element: document.body });
	if (type === "volume") {
		eventManager.addEventListener(document.documentElement, "contextmenu", onContextMenu, "scrollWheelController");
		eventManager.addEventListener(document.documentElement, "mouseup", onMouseUp, "scrollWheelController");
	}
}

export function updateScrollWheelConfig<T extends ScrollWheelControlType>(type: T, config: ControlConfigMap[T]) {
	controlConfigs[type] = config;
	rebuildDispatchConfig();
}

async function applySpeedSteps(runtime: ControlRuntime, steps: number) {
	const { speed: speedConfig } = controlConfigs;
	const snapshotOptions = optionsSnapshot?.data.options;
	if (!speedConfig || !snapshotOptions) return;
	const onScreenDisplay = getOnScreenDisplayConfig() ?? snapshotOptions.onScreenDisplay;
	let {
		playbackSpeedButtons: { speed: speedPerClick }
	} = snapshotOptions;
	try {
		({ speed: speedPerClick } = featureConfigManager.getLast("playbackSpeedButtons"));
	} catch {}
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const newSpeed = round(clamp(videoElement.playbackRate + steps * speedConfig.steps, youtubePlayerMinSpeed, youtubePlayerMaxSpeed), 2);
	if (newSpeed === videoElement.playbackRate) return;
	await setPlayerSpeed(newSpeed);
	await updatePlaybackSpeedButtonTooltips(newSpeed, speedPerClick);
	showOnScreenDisplay(onScreenDisplay, runtime.playerContainer, { max: youtubePlayerMaxSpeed, type: "speed", value: newSpeed });
}

async function applyVolumeSteps(runtime: ControlRuntime, steps: number) {
	const { volume: volumeConfig } = controlConfigs;
	const onScreenDisplay = getOnScreenDisplayConfig() ?? optionsSnapshot?.data.options.onScreenDisplay;
	if (!volumeConfig || !onScreenDisplay) return;
	const { playerContainer } = runtime;
	if (!playerContainer.getVolume || !playerContainer.setVolume || !playerContainer.isMuted || !playerContainer.unMute) return;
	const [volume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
	const newVolume = clamp(toDivisible(volume + steps * volumeConfig.steps, volumeConfig.steps), 0, 100);
	await playerContainer.setVolume(newVolume);
	if (isMuted) await playerContainer.unMute();
	showOnScreenDisplay(onScreenDisplay, playerContainer, { max: 100, type: "volume", value: newVolume });
}

/**
 * One capture-phase listener on the document. It runs before YouTube's own handlers on the controls, the
 * overlays and the shorts reel can take the event, and it survives YouTube replacing the player element -
 * which it does on shorts after an in-page navigation - because the player is resolved for every event.
 */
function attachWheelListener() {
	eventManager.addEventListener(document, "wheel", onWheel, "scrollWheelController", { capture: true, passive: false });
}

async function ensureOptionsSnapshot() {
	if (optionsSnapshot && Date.now() - optionsSnapshotTime < SNAPSHOT_TTL_MS) return;
	optionsSnapshotFetch ??= waitForSpecificMessage("options", "request_data", "content")
		.then((data) => {
			optionsSnapshot = data;
			optionsSnapshotTime = Date.now();
			rebuildDispatchConfig();
			return data;
		})
		.finally(() => {
			optionsSnapshotFetch = null;
		});
	await optionsSnapshotFetch;
}

async function findPlayerContainer(type: ScrollWheelControlType): Promise<Nullable<YouTubePlayerDiv>> {
	let playerContainer: Nullable<YouTubePlayerDiv> = null;
	const findPlayerTask = (): boolean => {
		const element = queryPlayerContainer(type);
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
	if (!wheelAreaOf("volume")?.contains(event.target as Node)) return;
	event.preventDefault();
	event.stopImmediatePropagation();
	toggleContextMenuVisibility("remove");
	suppressContextMenu = false;
}

function onMouseUp(event: MouseEvent) {
	if (!suppressContextMenu) return;
	if (!wheelAreaOf("volume")?.contains(event.target as Node)) return;
	setTimeout(() => {
		suppressContextMenu = false;
		toggleContextMenuVisibility("remove");
	}, CONTEXT_MENU_HIDE_TIMEOUT);
}

function onWheel(event: WheelEvent) {
	if (!dispatchConfig) return;
	const { speedEnabled, speedModifierKey, volumeHoldModifierKey, volumeHoldRightClick, volumeModifierKey } = dispatchConfig;
	let type: Nullable<ScrollWheelControlType> = null;
	if (speedEnabled && event[speedModifierKey]) {
		// The volume control always yields to the speed control's modifier.
		if (!activeControls.has("speed")) return;
		type = "speed";
	} else if (activeControls.has("volume") && (!volumeHoldModifierKey || event[volumeModifierKey]) && (!volumeHoldRightClick || event.buttons === 2)) {
		type = "volume";
	}
	if (!type) return;
	const { target } = event;
	const runtime = activeControls.get(type);
	if (!runtime) return;
	/**
	 * The listener sits on the document, so the event has to come from the player's area. The area is looked up now
	 * rather than at enable time, because YouTube swaps the shorts player element after a navigation.
	 */
	const playerContainer = queryPlayerContainer(type);
	if (!playerContainer || !wheelAreaAround(playerContainer).contains(target as Node)) return;
	runtime.playerContainer = playerContainer;
	if (target instanceof HTMLElement && target.id === getFeatureButtonId("volumeBoostButton")) return;
	const settingsPanelMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
	if (settingsPanelMenu?.contains(target as Node)) return;
	if (type === "volume" && volumeHoldRightClick) {
		toggleContextMenuVisibility("add");
		suppressContextMenu = true;
	}
	preventScroll(event);
	runtime.stepper.feed(event);
}

/** The player element a control of this type drives on the current page, or null when the page has none. */
function queryPlayerContainer(type: ScrollWheelControlType): Nullable<YouTubePlayerDiv> {
	if (isWatchPage() || (type === "volume" && isLivePage())) return document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (isShortsPage()) return document.querySelector<YouTubePlayerDiv>("div#shorts-player");
	return null;
}

function queueSteps(type: ScrollWheelControlType, wheelSteps: number) {
	const runtime = activeControls.get(type);
	if (!runtime) return;
	// Wheel-down is positive, but scrolling down should decrease the value.
	runtime.pendingSteps -= wheelSteps;
	if (runtime.applying) return;
	runtime.applying = true;
	void (async () => {
		try {
			/**
			 * Steps that arrive while an apply is in flight merge into the next apply, instead of queueing one player
			 * call each.
			 */
			while (runtime.pendingSteps !== 0) {
				const { pendingSteps: steps } = runtime;
				runtime.pendingSteps = 0;
				if (type === "volume") await applyVolumeSteps(runtime, steps);
				else await applySpeedSteps(runtime, steps);
			}
		} catch {
			runtime.pendingSteps = 0;
		} finally {
			runtime.applying = false;
		}
	})();
}

function rebuildDispatchConfig() {
	const speedConfig = controlConfigs.speed ?? optionsSnapshot?.data.options.scrollWheelSpeedControl;
	const volumeConfig = controlConfigs.volume ?? optionsSnapshot?.data.options.scrollWheelVolumeControl;
	if (!speedConfig || !volumeConfig) {
		dispatchConfig = null;
		return;
	}
	dispatchConfig = {
		speedEnabled: speedConfig.enabled,
		speedModifierKey: speedConfig.modifierKey,
		volumeHoldModifierKey: volumeConfig.holdModifierKey,
		volumeHoldRightClick: volumeConfig.holdRightClick,
		volumeModifierKey: volumeConfig.modifierKey
	};
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

/**
 * The area the controls react to. YouTube's wrapper containers carry overlays and controls the player's own
 * box does not include, so the outermost of them around the player counts as well.
 */
function wheelAreaAround(playerContainer: YouTubePlayerDiv): HTMLElement {
	return playerContainer.closest<HTMLElement>("div#player") ?? playerContainer.closest<HTMLElement>("#player-container") ?? playerContainer;
}

function wheelAreaOf(type: ScrollWheelControlType): Nullable<HTMLElement> {
	const playerContainer = queryPlayerContainer(type) ?? activeControls.get(type)?.playerContainer ?? null;
	return playerContainer ? wheelAreaAround(playerContainer) : null;
}
