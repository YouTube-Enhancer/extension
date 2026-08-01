import eventManager from "@/src/events/EventManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { getFeatureIcon, type GetIconType, type ToggleIcon } from "@/src/icons";
import { type AllButtonNames, type ButtonPlacement, type FullscreenPlacement, type Nullable, type SingleButtonFeatureNames } from "@/src/types";
import { getButtonColor } from "@/src/utils/deep-dark-theme";
import { createStyledElement, createSVGElement } from "@/src/utils/dom/elements";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { createTooltip, removeTooltip } from "@/src/utils/dom/tooltip";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

import type { BasicIcon, FeatureMenuOpenType, ListenerType } from "./types";

import { buttonContainerId } from "./constants";
import "./index.css";

const menuId = "#yte-feature-menu";
const menuButtonId = "#yte-feature-menu-button";
const panelId = "#yte-panel-menu";
const itemHeight = 40;
const menuPadding = 16;
export { buttonContainerId };

// ─── Module-level state ───────────────────────────────────────────

type TrackedButtonInfo = {
	currentEffectivePlacement: ButtonPlacement;
	fullscreenPlacement: FullscreenPlacement;
	icon: SVGSVGElement | ToggleIcon;
	initialChecked: boolean;
	isToggle: boolean;
	label: string;
	listener: ListenerType<boolean>;
	placement: ButtonPlacement;
};
const trackedButtons = new Map<AllButtonNames, TrackedButtonInfo>();
export const featuresInMenu = new Set<AllButtonNames>();

let fullscreenObserverActive = false;
let fullscreenObserver: Nullable<MutationObserver> = null;
let fullscreenDomHandler: Nullable<() => void> = null;

let theaterModeObserver: Nullable<MutationObserver> = null;
let theaterNavigationHandler: Nullable<() => void> = null;

let cleanupFeatureMenuListeners: Nullable<() => void> = null;
let featureMenuCssInjected = false;

// ─── Fullscreen helpers ───────────────────────────────────────────

function ensureContainerPosition() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const inTheaterMode = isInTheaterMode();
	const { parentElement: currentParent } = container;
	if (!currentParent) return;
	const isNewLayout = isNewYouTubeVideoLayout();
	const expectedParent =
		inTheaterMode ?
			isNewLayout ? document.querySelector("ytd-watch-grid")
			:	document.querySelector("ytd-watch-flexy")
		:	document.querySelector("div#primary > div#primary-inner");
	if (currentParent === expectedParent) return;
	if (inTheaterMode) {
		const parent = expectedParent as HTMLElement;
		const columns = parent?.querySelector("#columns");
		if (columns) parent.insertBefore(container, columns);
	} else {
		const player = expectedParent?.querySelector("#player");
		if (player) player.insertAdjacentElement("afterend", container);
	}
}

async function getPlacementRoot(placement: ButtonPlacement) {
	switch (placement) {
		case "below_player":
			return await waitForElement<HTMLDivElement>(`#${buttonContainerId}`);
		case "feature_menu":
			return await waitForElement<HTMLDivElement>("#yte-feature-menu");
		case "player_controls_left":
			return await waitForElement<HTMLDivElement>(".ytp-left-controls");
		case "player_controls_right":
			return await waitForElement<HTMLDivElement>(".ytp-right-controls", 15000);
	}
}

function getPlacementSelector(placement: ButtonPlacement): string | undefined {
	if (placement === "below_player") {
		return (
			isInTheaterMode() ?
				isNewYouTubeVideoLayout() ? "ytd-watch-grid"
				:	"ytd-watch-flexy"
			:	"div#primary > div#primary-inner > div#player"
		);
	}
	if (placement === "feature_menu") return "#yte-feature-menu";
	if (placement === "player_controls_left") return ".ytp-left-controls";
	if (placement === "player_controls_right") return ".ytp-right-controls";
	return undefined;
}

function internalIsFullscreen(): boolean {
	return !!document.fullscreenElement || document.querySelector("ytd-app[fullscreen]") !== null;
}

// ─── Theater helpers ──────────────────────────────────────────────

function isInTheaterMode(): boolean {
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
	return inTheaterMode;
}

function onFullscreenChange() {
	fullscreenDomHandler?.();
}

function startFullscreenObserver(callback: () => void) {
	fullscreenDomHandler = callback;
	const target = document.querySelector("ytd-app");
	if (target) {
		fullscreenObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "attributes" && mutation.attributeName === "fullscreen") {
					callback();
				}
			}
		});
		fullscreenObserver.observe(target, { attributeFilter: ["fullscreen"], attributes: true });
	}
	document.addEventListener("fullscreenchange", onFullscreenChange, { passive: true });
}

async function startTheaterModeObserver() {
	if (theaterModeObserver) return;
	const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeButton) return;
	theaterModeObserver = new MutationObserver(() => {
		ensureContainerPosition();
	});
	theaterModeObserver.observe(sizeButton, { attributeFilter: ["class"], attributes: true, childList: true, subtree: true });
	theaterNavigationHandler = () => stopTheaterModeObserver();
	document.addEventListener("yt-navigate-start", theaterNavigationHandler);
}

// ─── Placement selector ───────────────────────────────────────────

function stopFullscreenObserver() {
	fullscreenObserver?.disconnect();
	fullscreenObserver = null;
	document.removeEventListener("fullscreenchange", onFullscreenChange);
	fullscreenDomHandler = null;
}

// ─── Placement root lookup ────────────────────────────────────────

function stopTheaterModeObserver() {
	if (theaterNavigationHandler) {
		document.removeEventListener("yt-navigate-start", theaterNavigationHandler);
		theaterNavigationHandler = null;
	}
	theaterModeObserver?.disconnect();
	theaterModeObserver = null;
}

// ─── DOM creation (container / button / menu) ─────────────────────

const rightControlsContainerId = "yte-right-controls-container";

export async function addButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Label extends string, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: Label,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked: boolean = false,
	fullscreenPlacement: FullscreenPlacement
) {
	const effectivePlacement = getEffectivePlacement(placement, fullscreenPlacement);
	const selector = getPlacementSelector(effectivePlacement);
	await enableFeatureMenuButton();
	if (selector) {
		const element = await waitForElement(selector);
		if (!element) return;
	}
	switch (effectivePlacement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const featureButton = getFeatureButton(buttonName);
			if (featureButton) await removeButton(buttonName);
			const button = await makeFeatureButton(
				buttonName,
				effectivePlacement,
				label,
				icon as GetIconType<Name, Exclude<ButtonPlacement, "feature_menu">>,
				listener,
				isToggle,
				initialChecked
			);
			await placeButton(button, effectivePlacement);
			break;
		}
		case "feature_menu": {
			const featureMenuItem = getFeatureMenuItem(buttonName);
			if (featureMenuItem) removeFeatureItemFromMenu(buttonName);
			if (icon instanceof SVGSVGElement) await addFeatureItemToMenu(buttonName, label, icon, listener, isToggle, initialChecked);
			break;
		}
	}
	trackButton(buttonName, placement, fullscreenPlacement, label, icon, listener, isToggle, initialChecked);
}

export async function addFeatureItemToMenu<Name extends AllButtonNames, Toggle extends boolean>(
	buttonName: Name,
	label: string,
	icon: BasicIcon,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked = false
) {
	const featureName = metadataRegistry.getButtonFeature(buttonName);
	if (!featureName) return;
	featuresInMenu.add(buttonName);
	await waitForElement(menuId);
	const featureMenu = getMenu();
	if (!featureMenu) return;
	const panel = getMenuPanel(featureMenu);
	if (!panel) return;
	const { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId } = getFeatureIds(buttonName);
	let menuItem = panel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	if (menuItem) {
		const labelEl = menuItem.querySelector<HTMLDivElement>(`#${featureMenuItemLabelId}`);
		if (labelEl) labelEl.textContent = label;
		eventManager.removeEventListener(menuItem, "click", featureName);
		eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem!, listener, isToggle), featureName);
		return;
	}
	menuItem = document.createElement("div");
	menuItem.className = "ytp-menuitem";
	menuItem.id = featureMenuItemId;
	menuItem.style.height = `${itemHeight}px`;
	menuItem.setAttribute("role", "menuitemcheckbox");
	const menuItemIcon = document.createElement("div");
	menuItemIcon.id = featureMenuItemIconId;
	menuItemIcon.className = "ytp-menuitem-icon";
	menuItemIcon.appendChild(icon);
	menuItem.appendChild(menuItemIcon);
	const menuItemLabel = document.createElement("div");
	menuItemLabel.className = "ytp-menuitem-label";
	menuItemLabel.textContent = label;
	menuItemLabel.id = featureMenuItemLabelId;
	menuItem.appendChild(menuItemLabel);
	const menuItemContent = document.createElement("div");
	menuItemContent.className = "ytp-menuitem-content";
	menuItem.appendChild(menuItemContent);
	if (isToggle) {
		const menuItemToggle = document.createElement("div");
		menuItemToggle.className = "ytp-menuitem-toggle-checkbox";
		menuItemContent.appendChild(menuItemToggle);
		setMenuItemChecked(menuItem, initialChecked);
	}
	eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem, listener, isToggle), featureName);
	panel.appendChild(menuItem);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (featureMenuButton) {
		featureMenuButton.style.display = "flex";
		featureMenuButton.style.visibility = "visible";
	}
	updateMenuSize(featureMenu, panel);
}

export async function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): Promise<boolean> {
	const root = await getPlacementRoot(placement);
	if (!root) return false;
	if (placement === "feature_menu") return root.querySelector(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
	return root.querySelectorAll(`#${getFeatureButtonId(buttonName)}`).length > 0;
}

export async function enableFeatureMenu() {
	await enableFeatureMenuButton();
}

// ─── Button DOM creation ──────────────────────────────────────────

export async function enableFeatureMenuButton() {
	if (document.querySelector(menuButtonId)) return;
	if (cleanupFeatureMenuListeners) cleanupFeatureMenuListeners();
	if (!featureMenuCssInjected) {
		featureMenuCssInjected = true;
		const style = document.createElement("style");
		style.textContent = `body:not(:has(.ytp-delhi-modern)) #yte-feature-menu-button{justify-content:center;align-items:center}`;
		document.head.appendChild(style);
	}

	const existingMenu = document.querySelector<HTMLDivElement>(menuId);
	const featureMenu = existingMenu ?? createFeatureMenuDom();

	const featureMenuButton = createStyledElement({
		classlist: ["ytp-button"],
		elementId: "yte-feature-menu-button",
		elementType: "button",
		styles: { display: "none", visibility: "hidden" }
	});
	featureMenuButton.dataset.title = window.i18nextInstance.t((translations) => translations.pages.content.features.featureMenu.button.label);
	featureMenuButton.appendChild(makeFeatureMenuIcon());

	const container = await getOrCreateRightControlsContainer();
	if (!container) return;
	container.insertAdjacentElement("afterend", featureMenuButton);

	if (!isWatchPage()) return;
	const playerContainer = await waitForElement<HTMLDivElement>("#movie_player");
	if (!playerContainer) return;
	playerContainer.insertAdjacentElement("afterbegin", featureMenu);

	const updateMenuPosition = () => {
		const buttonRect = featureMenuButton.getBoundingClientRect();
		const playerRect = playerContainer.getBoundingClientRect();
		const { offsetWidth: menuWidth } = featureMenu;
		const buttonCenterX = buttonRect.x - playerRect.x + buttonRect.width / 2;
		const anchorRatio = 0.6556;
		const anchorOffset = menuWidth * anchorRatio;
		const left = buttonCenterX - anchorOffset;
		featureMenu.style.left = `${left}px`;
	};
	updateMenuPosition();
	const resizeObserver = new ResizeObserver(() => {
		requestAnimationFrame(updateMenuPosition);
	});
	resizeObserver.observe(playerContainer);
	window.addEventListener("resize", updateMenuPosition);
	window.addEventListener("yte-feature-menu-resized", updateMenuPosition);

	const {
		data: {
			options: {
				featureMenu: { openType }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await waitForAllElements([menuId, menuButtonId]);

	cleanupFeatureMenuListeners = () => {
		window.removeEventListener("resize", updateMenuPosition);
		window.removeEventListener("yte-feature-menu-resized", updateMenuPosition);
		resizeObserver.disconnect();
	};
	const listenersCleanup = setupFeatureMenuEventListeners(openType);
	const origCleanup = cleanupFeatureMenuListeners;
	cleanupFeatureMenuListeners = () => {
		window.removeEventListener("resize", updateMenuPosition);
		window.removeEventListener("yte-feature-menu-resized", updateMenuPosition);
		resizeObserver.disconnect();
		listenersCleanup();
		origCleanup?.();
	};
}

export function getEffectivePlacement(placement: ButtonPlacement, fullscreenPlacement: FullscreenPlacement): ButtonPlacement {
	return internalIsFullscreen() && fullscreenPlacement !== "same" ? fullscreenPlacement : placement;
}

export function getFeatureButton(buttonName: AllButtonNames) {
	return getFeatureMenuItem(buttonName) ?? document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
}

export function getFeatureButtonId(buttonName: AllButtonNames) {
	return `yte-feature-${buttonName}-button` as const;
}

export function getFeatureIds(buttonName: AllButtonNames) {
	return {
		featureMenuItemIconId: `yte-${buttonName}-icon`,
		featureMenuItemId: `yte-feature-${buttonName}-menuitem`,
		featureMenuItemLabelId: `yte-${buttonName}-label`
	} as const;
}

export function getFeatureMenuItem(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector = `#yte-feature-${buttonName}-menuitem` as const;
	return document.querySelector(`#yte-panel-menu > ${selector}`);
}

// ─── Menu item helpers ────────────────────────────────────────────

export function getFeatureMenuItemIcon(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector = `#yte-${buttonName}-icon` as const;
	return document.querySelector(selector);
}

export function getFeatureMenuItemLabel(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector = `#yte-${buttonName}-label` as const;
	return document.querySelector(selector);
}

export async function modifyIconForLightTheme<T extends SVGSVGElement | ToggleIcon>(icon: T, isToggle = false, overrideColor?: boolean) {
	const color = overrideColor ? "#FFFFFF" : undefined;
	if (isToggle && typeof icon === "object" && "off" in icon && "on" in icon) {
		await applyThemeToSvg(icon.on, color);
		await applyThemeToSvg(icon.off, color);
	} else if (icon instanceof SVGSVGElement) {
		await applyThemeToSvg(icon, color);
	}
	return icon;
}

export async function removeButton<Name extends AllButtonNames>(buttonName: Name, placement?: ButtonPlacement) {
	const featureName = metadataRegistry.getButtonFeature(buttonName);
	if (!featureName) return;
	untrackButton(buttonName);
	if (placement === undefined) {
		const {
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		const { [featureName]: featureConfig } = options;
		if (typeof featureConfig === "object" && featureConfig !== null) {
			if ("buttons" in featureConfig) {
				placement = featureConfig.buttons?.[buttonName as keyof typeof featureConfig.buttons]?.placement;
			} else if ("button" in featureConfig) {
				placement = featureConfig.button?.placement;
			}
		}
	}
	switch (placement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const buttons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
			if (buttons.length === 0) return;
			buttons.forEach((button) => button.remove());
			removeTooltip(`yte-feature-${featureName as SingleButtonFeatureNames}-tooltip`);
			break;
		}
		case "feature_menu": {
			removeFeatureItemFromMenu(buttonName);
			break;
		}
	}
}

export function removeFeatureItemFromMenu(buttonName: AllButtonNames) {
	featuresInMenu.delete(buttonName);
	const featureMenu = getMenu();
	if (!featureMenu) return;
	const featureMenuPanel = getMenuPanel(featureMenu);
	if (!featureMenuPanel) return;
	const { featureMenuItemId } = getFeatureIds(buttonName);
	const featureMenuItem = featureMenuPanel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	if (!featureMenuItem) return;
	featureMenuItem.remove();
	updateMenuSize(featureMenu, featureMenuPanel);

	if (featureMenuPanel.childElementCount === 0) {
		featureMenu.style.visibility = "hidden";
		const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
		if (featureMenuButton) featureMenuButton.style.display = "none";
	}
}

export function setupFeatureMenuEventListeners(featureMenuOpenType: FeatureMenuOpenType): () => void {
	eventManager.removeEventListeners("featureMenu");
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const playerContainer = document.querySelector<HTMLDivElement>("#movie_player");
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	const featureMenu = document.querySelector<HTMLDivElement>(menuId);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (!settingsButton || !playerContainer || !bottomControls || !featureMenu || !featureMenuButton) return () => {};
	const { listener: showFeatureMenuTooltip, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-featureMenu-tooltip"
	});

	let menuVisible = false;
	let observer: Nullable<MutationObserver> = null;

	const hideYouTubeSettings = () => {
		const settingsMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
		if (settingsMenu && settingsMenu.style.display !== "none") settingsButton.click();
	};
	const showFeatureMenu = () => {
		if (menuVisible) return;
		menuVisible = true;
		adjustAdsContainerStyles(true);
		bottomControls.style.opacity = "1";
		featureMenu.style.visibility = "visible";
	};
	const hideFeatureMenu = () => {
		if (!menuVisible) return;
		menuVisible = false;
		adjustAdsContainerStyles(false);
		featureMenu.style.visibility = "hidden";
		bottomControls.style.opacity = "";
	};
	const clickOutsideListener = (event: Event) => {
		const target = event.target as Node;
		if (featureMenuButton.contains(target) || featureMenu.contains(target)) return;
		hideFeatureMenu();
	};

	switch (featureMenuOpenType) {
		case "click":
			eventManager.addEventListener(document.documentElement, "click", clickOutsideListener, "featureMenu");
			eventManager.addEventListener(featureMenuButton, "click", () => (menuVisible ? hideFeatureMenu() : showFeatureMenu()), "featureMenu");
			eventManager.addEventListener(featureMenuButton, "mouseleave", removeFeatureMenuTooltip, "featureMenu");
			eventManager.addEventListener(featureMenuButton, "mouseover", showFeatureMenuTooltip, "featureMenu");
			break;
		case "hover": {
			let hideTimer: Nullable<number> = null;
			const cancelHide = () => {
				if (hideTimer) {
					clearTimeout(hideTimer);
					hideTimer = null;
				}
			};
			const scheduleHide = () => {
				cancelHide();
				hideTimer = window.setTimeout(() => {
					removeFeatureMenuTooltip();
					hideFeatureMenu();
				}, 80);
			};
			const show = () => {
				cancelHide();
				hideYouTubeSettings();
				showFeatureMenuTooltip();
				showFeatureMenu();
			};
			eventManager.addEventListener(featureMenuButton, "pointerenter", show, "featureMenu");
			eventManager.addEventListener(featureMenuButton, "pointerleave", scheduleHide, "featureMenu");
			eventManager.addEventListener(featureMenu, "pointerenter", cancelHide, "featureMenu");
			eventManager.addEventListener(featureMenu, "pointerleave", scheduleHide, "featureMenu");
			eventManager.addEventListener(playerContainer, "pointerleave", scheduleHide, "featureMenu");
			eventManager.addEventListener(document.documentElement, "click", clickOutsideListener, "featureMenu");
			break;
		}
	}

	observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node instanceof HTMLElement)) continue;
				if (node.classList.contains("video-ads") && node.classList.contains("ytp-ad-module")) {
					adjustAdsContainerStyles(menuVisible);
				}
			}
		}
	});

	observer.observe(playerContainer, { childList: true, subtree: true });

	return () => {
		eventManager.removeEventListeners("featureMenu");
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	};
}

// ─── Public API ───────────────────────────────────────────────────

export function updateButtonsIconColor() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const buttons = container.querySelectorAll<HTMLButtonElement>("button");
	for (const button of buttons) {
		const icon = button?.querySelector<SVGSVGElement>("svg");
		if (icon) void applyThemeToSvg(icon);
	}
}

export function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	button.replaceChildren(icon);
}

export function updateFeatureButtonTitle(buttonName: AllButtonNames, title: string) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	if (button) {
		button.dataset.title = title;
		const tooltip = document.getElementById(`yte-feature-${buttonName}-tooltip`);
		if (tooltip) tooltip.textContent = title;
	}
}

export function updateFeatureMenuTitle(title: string) {
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (featureMenuButton) featureMenuButton.dataset.title = title;
}

export function updateTrackedButtonConfig(buttonName: AllButtonNames, fullscreenPlacement: FullscreenPlacement) {
	const info = trackedButtons.get(buttonName);
	if (info) {
		info.fullscreenPlacement = fullscreenPlacement;
	}
}

function adjustAdsContainerStyles(featureMenuOpen: boolean) {
	const adsSpan = document.querySelector<HTMLSpanElement>("div.video-ads.ytp-ad-module span.ytp-ad-preview-container");
	if (!adsSpan) return;
	adsSpan.style.opacity = featureMenuOpen ? "0.4" : "";
	adsSpan.style.zIndex = featureMenuOpen ? "36" : "";
}

// ─── Tracked button management ────────────────────────────────────

function appendIcon(button: HTMLButtonElement, icon: SVGSVGElement | ToggleIcon, checked?: boolean) {
	button.replaceChildren();
	if (typeof icon === "object" && "on" in icon && "off" in icon) {
		button.append(checked ? icon.on : icon.off);
	} else if (icon instanceof SVGSVGElement) {
		button.append(icon);
	}
}

async function applyThemeToSvg(svg: SVGSVGElement, forceColor?: "#000000" | "#FFFFFF") {
	const color = forceColor ?? (await getButtonColor());
	if (svg.hasAttribute("fill") && svg.getAttribute("fill") !== "none") svg.setAttribute("fill", color);
	if (svg.hasAttribute("stroke") && svg.getAttribute("stroke") !== "none") svg.setAttribute("stroke", color);
	const elements = svg.querySelectorAll("[fill]:not([fill='none']), [stroke]:not([stroke='none'])");
	for (const el of elements) {
		if (el.hasAttribute("fill")) el.setAttribute("fill", color);
		if (el.hasAttribute("stroke")) el.setAttribute("stroke", color);
	}
}

function buttonClickListener<Placement extends ButtonPlacement, Name extends AllButtonNames, Toggle extends boolean>(
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	const newState = !getChecked(button);
	setChecked(button, newState);
	if (typeof icon === "object" && "off" in icon && "on" in icon) updateFeatureButtonIcon(button, newState ? icon.on : icon.off);
	else if (icon instanceof SVGSVGElement) updateFeatureButtonIcon(button, icon);
	listener(newState);
}

// ─── Fullscreen handler ───────────────────────────────────────────

function createFeatureMenuDom() {
	const featureMenu = createStyledElement({
		classlist: ["ytp-popup", "ytp-settings-menu"],
		elementId: "yte-feature-menu",
		elementType: "div",
		styles: { display: "block", visibility: "hidden", zIndex: "2050" }
	});
	const featureMenuPanel = createStyledElement({
		classlist: ["ytp-panel"],
		elementId: "yte-feature-menu-panel",
		elementType: "div",
		styles: { display: "contents" }
	});
	featureMenu.appendChild(featureMenuPanel);
	const featureMenuPanelMenu = createStyledElement({
		classlist: ["ytp-panel-menu"],
		elementId: "yte-panel-menu",
		elementType: "div"
	});
	featureMenuPanel.appendChild(featureMenuPanelMenu);
	return featureMenu;
}

// ─── Button creation + placement ──────────────────────────────────

function featureMenuClickListener<Toggle extends boolean>(menuItem: HTMLDivElement, listener: ListenerType<Toggle>, isToggle: boolean) {
	if (!isToggle) return listener();
	const newState = !getMenuItemChecked(menuItem);
	setMenuItemChecked(menuItem, newState);
	listener(newState);
}

function getChecked(button: HTMLButtonElement) {
	return button.getAttribute("aria-checked") === "true";
}

function getMenu(): Nullable<HTMLDivElement> {
	return document.querySelector<HTMLDivElement>(menuId);
}

// ─── Menu item management ─────────────────────────────────────────

function getMenuItemChecked(item: HTMLDivElement) {
	return item.getAttribute("aria-checked") === "true";
}

function getMenuPanel(menu: HTMLDivElement): Nullable<HTMLDivElement> {
	return menu.querySelector<HTMLDivElement>(panelId);
}

async function getOrCreateButtonContainer(inTheaterMode: boolean): Promise<Nullable<HTMLDivElement>> {
	let container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (container) return container;
	container = createStyledElement({
		elementId: buttonContainerId,
		elementType: "div",
		styles: { display: "flex", height: "48px", justifyContent: "center" }
	});
	if (inTheaterMode) {
		const isNewLayout = isNewYouTubeVideoLayout();
		const parent = isNewLayout ? document.querySelector<HTMLElement>("ytd-watch-grid") : document.querySelector<HTMLElement>("ytd-watch-flexy");
		if (!parent) return null;
		const columns = parent.querySelector("#columns");
		if (columns) {
			parent.insertBefore(container, columns);
			return container;
		}
		parent.append(container);
		return container;
	}
	const player = await waitForElement<HTMLDivElement>("div#primary > div#primary-inner > div#player");
	if (!player) return null;
	player.insertAdjacentElement("afterend", container);
	return container;
}

async function getOrCreateRightControlsContainer(): Promise<Nullable<HTMLDivElement>> {
	const rightControls = await waitForElement<HTMLDivElement>(".ytp-right-controls", 15000);
	if (!rightControls) return null;
	let container = rightControls.querySelector<HTMLDivElement>(`#${rightControlsContainerId}`);
	if (!container) {
		container = createStyledElement({
			elementId: rightControlsContainerId,
			elementType: "div",
			styles: { alignItems: "center", display: "flex" }
		});
		const leftSide = rightControls.querySelector<HTMLDivElement>(".ytp-right-controls-left");
		if (leftSide) leftSide.insertAdjacentElement("beforebegin", container);
		else rightControls.prepend(container);
	}
	return container;
}

async function handleFullscreenChange() {
	const inFullscreen = internalIsFullscreen();
	for (const [buttonName, info] of trackedButtons) {
		const effectivePlacement = inFullscreen && info.fullscreenPlacement !== "same" ? info.fullscreenPlacement : info.placement;
		if (effectivePlacement === info.currentEffectivePlacement) continue;

		if (info.currentEffectivePlacement !== "feature_menu") {
			const oldButton = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
			if (oldButton) {
				oldButton.remove();
				const tooltip = document.getElementById(`yte-feature-${buttonName}-tooltip`);
				if (tooltip) tooltip.remove();
			}
		} else {
			removeFeatureItemFromMenu(buttonName);
		}

		if (effectivePlacement !== "feature_menu") {
			const placementIcon = getFeatureIcon(buttonName, effectivePlacement);
			const button = await makeFeatureButton(
				buttonName,
				effectivePlacement,
				info.label,
				placementIcon,
				info.listener,
				info.isToggle,
				info.initialChecked
			);
			await placeButton(button, effectivePlacement);
		} else {
			const menuIcon = getFeatureIcon(buttonName, "feature_menu");
			if (menuIcon instanceof SVGSVGElement) {
				await addFeatureItemToMenu(buttonName, info.label, menuIcon, info.listener, info.isToggle, info.initialChecked);
			}
		}

		info.currentEffectivePlacement = effectivePlacement;
	}
}

async function makeFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: string,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked = false
) {
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const featureName = metadataRegistry.getButtonFeature(buttonName);
	if (!featureName) throw new Error(`No feature found for button "${buttonName}"`);
	const existingButtons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	if (existingButtons.length > 0) {
		existingButtons.forEach((btn) => btn.remove());
	}
	const button = createStyledElement({
		classlist: [
			"ytp-button",
			placement === "below_player" ? "yte-button-below-player"
			: placement === "player_controls_right" ? "yte-button-player-controls-right"
			: "yte-button-player-controls-left"
		],
		elementId: getFeatureButtonId(buttonName),
		elementType: "button"
	});
	button.dataset.title = label;
	const { listener: tooltipListener, update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	icon = await modifyIconForLightTheme(icon, isToggle, placement !== "below_player");
	if (isToggle) {
		setChecked(button, initialChecked);
		appendIcon(button, icon, initialChecked);
	} else {
		appendIcon(button, icon);
	}
	eventManager.removeEventListener(button, "mouseover", featureName);
	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
	eventManager.removeEventListener(button, "click", featureName);
	eventManager.addEventListener(
		button,
		"click",
		() => {
			buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle);
			update();
		},
		featureName
	);
	return button;
}

// ─── Utility exports ──────────────────────────────────────────────

function makeFeatureMenuIcon() {
	return createSVGElement(
		"svg",
		{ fill: "white", height: "24px", viewBox: "0 0 24 24", width: "24px" },
		createSVGElement("path", {
			d: "M 3.1273593,7.5636797 H 7.5636797 V 3.1273593 H 3.1273593 Z M 9.7818397,20.872641 H 14.21816 V 16.43632 H 9.7818397 Z m -6.6544804,0 H 7.5636797 V 16.43632 H 3.1273593 Z m 0,-6.654481 H 7.5636797 V 9.7818397 H 3.1273593 Z m 6.6544804,0 H 14.21816 V 9.7818397 H 9.7818397 Z M 16.43632,3.1273593 v 4.4363204 h 4.436321 V 3.1273593 Z M 9.7818397,7.5636797 H 14.21816 V 3.1273593 H 9.7818397 Z M 16.43632,14.21816 h 4.436321 V 9.7818397 H 16.43632 Z m 0,6.654481 h 4.436321 V 16.43632 H 16.43632 Z",
			fill: "white"
		})
	);
}

async function placeButton(button: HTMLButtonElement, placement: Exclude<ButtonPlacement, "feature_menu">) {
	switch (placement) {
		case "below_player": {
			const inTheaterMode = isInTheaterMode();
			const container = await getOrCreateButtonContainer(inTheaterMode);
			if (!container) return;
			await startTheaterModeObserver();
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
		case "player_controls_left": {
			const leftControls = await waitForElement<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return;
			const existingInContainer = leftControls.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			const timeDisplay = leftControls.querySelector<HTMLDivElement>(".ytp-time-display");
			if (timeDisplay) timeDisplay.insertAdjacentElement("beforebegin", button);
			break;
		}
		case "player_controls_right": {
			const container = await getOrCreateRightControlsContainer();
			if (!container) return;
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
	}
}

function setChecked(button: HTMLButtonElement, value: boolean) {
	button.setAttribute("aria-checked", String(value));
}

function setMenuItemChecked(item: HTMLDivElement, value: boolean) {
	item.setAttribute("aria-checked", String(value));
	item.classList.toggle("ytp-menuitem-checked", value);
}

function trackButton(
	buttonName: AllButtonNames,
	placement: ButtonPlacement,
	fullscreenPlacement: FullscreenPlacement,
	label: string,
	icon: SVGSVGElement | ToggleIcon,
	listener: ListenerType<boolean>,
	isToggle: boolean,
	initialChecked: boolean
) {
	const effectivePlacement = getEffectivePlacement(placement, fullscreenPlacement);
	trackedButtons.set(buttonName, {
		currentEffectivePlacement: effectivePlacement,
		fullscreenPlacement,
		icon,
		initialChecked,
		isToggle,
		label,
		listener,
		placement
	});
	if (!fullscreenObserverActive) {
		fullscreenObserverActive = true;
		startFullscreenObserver(() => {
			void handleFullscreenChange();
		});
	}
}

function untrackButton(buttonName: AllButtonNames) {
	trackedButtons.delete(buttonName);
	if (trackedButtons.size === 0 && fullscreenObserverActive) {
		fullscreenObserverActive = false;
		stopFullscreenObserver();
	}
}

function updateMenuSize(menu: HTMLDivElement, panel: HTMLDivElement) {
	menu.style.height = `${itemHeight * panel.childElementCount + menuPadding}px`;
	menu.style.width = "fit-content";
	window.dispatchEvent(new CustomEvent("yte-feature-menu-resized"));
}

export type { ListenerType } from "./types";
