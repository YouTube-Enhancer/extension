import type { AllButtonNames, Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featurePlayerManager } from "@/src/features/_registry/featurePlayerManager";
import { getFeatureMenuConfig } from "@/src/ui/configProvider";
import { createStyledElement, createSVGElement } from "@/src/utils/dom/elements";
import { subscribeToDomMutations } from "@/src/utils/dom/observers/domMutationBus";
import { pageReadinessSelectors, waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import type { BasicIcon, FeatureMenuOpenType, ListenerType } from "./types";

import { updateTrackedButtonChecked } from "./buttonState";
import { getOrCreateRightControlsContainer } from "./containerTracking";

const menuId = "#yte-feature-menu";
const menuButtonId = "#yte-feature-menu-button";
const panelId = "#yte-panel-menu";
const itemHeight = 40;
const menuPadding = 16;

// ─── Module-level state ───────────────────────────────────────────

const featuresInMenu = new Set<AllButtonNames>();

let cleanupFeatureMenuListeners: Nullable<() => void> = null;
let featureMenuCssInjected = false;
/** Superseded-bind counter; a newer bind (or a teardown) aborts an in-flight listener retry. */
let featureMenuBindGeneration = 0;

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
	await waitForElement(menuId);
	const featureMenu = getMenu();
	if (!featureMenu) return;
	const panel = getMenuPanel(featureMenu);
	if (!panel) return;
	const { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId } =
		getFeatureIds(buttonName);
	let menuItem = panel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	if (menuItem) {
		const labelEl = menuItem.querySelector<HTMLDivElement>(`#${featureMenuItemLabelId}`);
		if (labelEl) labelEl.textContent = label;
		eventManager.removeEventListener(menuItem, "click", featureName);
		eventManager.addEventListener(
			menuItem,
			"click",
			() => featureMenuClickListener(buttonName, menuItem!, listener, isToggle),
			featureName
		);
		featuresInMenu.add(buttonName);
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
	eventManager.addEventListener(
		menuItem,
		"click",
		() => featureMenuClickListener(buttonName, menuItem, listener, isToggle),
		featureName
	);
	panel.appendChild(menuItem);
	featuresInMenu.add(buttonName);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (featureMenuButton) {
		featureMenuButton.style.display = "flex";
		featureMenuButton.style.visibility = "visible";
	}
	updateMenuSize(featureMenu, panel);
}

// ─── DOM helpers ──────────────────────────────────────────────────

/**
 * Binds the feature menu listeners for `openType`, retrying through the player manager while the
 * player chrome is still rendering. setupFeatureMenuEventListeners bails when any element it needs
 * is missing; without a retry, an openType switch that lands during a re-render left the menu with
 * no listeners at all - neither hover nor click did anything until the next full setup.
 */
export function bindFeatureMenuEventListeners(openType: FeatureMenuOpenType): () => void {
	const generation = ++featureMenuBindGeneration;
	let cleanup = setupFeatureMenuEventListeners(openType);
	if (cleanup) return cleanup;
	void featurePlayerManager.executeWithRetries(
		"featureMenu",
		[
			() => {
				// A newer bind or a teardown superseded this retry.
				if (generation !== featureMenuBindGeneration) return true;
				cleanup = setupFeatureMenuEventListeners(openType);
				return cleanup !== null;
			}
		],
		["bind-feature-menu-listeners"],
		{ pageTypes: ["watch"], waitForLoaded: true }
	);
	return () => {
		// Supersede any in-flight retry and tear down whatever ended up bound.
		if (generation === featureMenuBindGeneration) featureMenuBindGeneration++;
		cleanup?.();
		cleanup = null;
	};
}

export async function enableFeatureMenu() {
	await enableFeatureMenuButton();
}

export async function enableFeatureMenuButton() {
	if (!isWatchPage()) return;
	if (document.querySelector(menuButtonId)) return;
	if (document.querySelector(pageReadinessSelectors.playerControlsRight)) {
		await createFeatureMenuButton();
		return;
	}
	// The menu button lives in the player controls. When the controls are absent (a
	// stripped page, or controls that render very late), waiting here would block
	// every button feature's reconcile for the full wait duration, and a reconcile
	// pays that cost twice. Retry creation through the player manager instead.
	void featurePlayerManager.executeWithRetries(
		"featureMenu",
		[createFeatureMenuButton],
		["create-feature-menu-button"],
		{ waitForLoaded: true }
	);
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

export function getFeatureMenuItemIcon(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector = `#yte-${buttonName}-icon` as const;
	return document.querySelector(selector);
}

// ─── ID helpers ───────────────────────────────────────────────────

export function getFeatureMenuItemLabel(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector = `#yte-${buttonName}-label` as const;
	return document.querySelector(selector);
}

export function hasFeaturesInMenu(): boolean {
	return featuresInMenu.size > 0;
}

// ─── DOM queries ──────────────────────────────────────────────────

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

/**
 * Binds the open/close listeners for `openType`. Returns the teardown, or null when the player
 * chrome is not rendered yet and none of the listeners could be attached; callers retry through
 * {@link bindFeatureMenuEventListeners} instead of leaving the menu dead until the next reload.
 */
export function setupFeatureMenuEventListeners(
	featureMenuOpenType: FeatureMenuOpenType
): Nullable<() => void> {
	eventManager.removeEventListeners("featureMenu");
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const playerContainer = document.querySelector<HTMLDivElement>("#movie_player");
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	const featureMenu = document.querySelector<HTMLDivElement>(menuId);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (!settingsButton || !playerContainer || !bottomControls || !featureMenu || !featureMenuButton)
		return null;
	const { listener: showFeatureMenuTooltip, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-featureMenu-tooltip"
	});

	let menuVisible = false;

	const hideYouTubeSettings = () => {
		const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu");
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
			eventManager.addEventListener(
				document.documentElement,
				"click",
				clickOutsideListener,
				"featureMenu"
			);
			eventManager.addEventListener(
				featureMenuButton,
				"click",
				() => (menuVisible ? hideFeatureMenu() : showFeatureMenu()),
				"featureMenu"
			);
			eventManager.addEventListener(
				featureMenuButton,
				"mouseleave",
				removeFeatureMenuTooltip,
				"featureMenu"
			);
			eventManager.addEventListener(
				featureMenuButton,
				"mouseover",
				showFeatureMenuTooltip,
				"featureMenu"
			);
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
			eventManager.addEventListener(
				document.documentElement,
				"click",
				clickOutsideListener,
				"featureMenu"
			);
			break;
		}
	}

	// Ad modules inside player chrome ride the shared mutation bus
	const unsubscribeAdsBus = subscribeToDomMutations(".video-ads.ytp-ad-module", () => {
		adjustAdsContainerStyles(menuVisible);
	});

	return () => {
		eventManager.removeEventListeners("featureMenu");
		unsubscribeAdsBus();
	};
}

export function updateFeatureMenuTitle(title: string) {
	const featureMenuButton = document.querySelector<HTMLButtonElement>(menuButtonId);
	if (featureMenuButton) featureMenuButton.dataset.title = title;
}

// ─── Menu item click handler ──────────────────────────────────────

function adjustAdsContainerStyles(featureMenuOpen: boolean) {
	const adsSpan = document.querySelector<HTMLSpanElement>(
		"div.video-ads.ytp-ad-module span.ytp-ad-preview-container"
	);
	if (!adsSpan) return;
	adsSpan.style.opacity = featureMenuOpen ? "0.4" : "";
	adsSpan.style.zIndex = featureMenuOpen ? "36" : "";
}

// ─── Menu item management ─────────────────────────────────────────

async function createFeatureMenuButton(): Promise<boolean> {
	if (document.querySelector(menuButtonId)) return true;
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
	featureMenuButton.dataset.title = window.i18nextInstance.t(
		(translations) => translations.pages.content.features.featureMenu.button.label
	);
	featureMenuButton.appendChild(makeFeatureMenuIcon());

	const container = getOrCreateRightControlsContainer();
	if (!container) return false;
	container.insertAdjacentElement("afterend", featureMenuButton);

	const playerContainer = await waitForPagePlayer();
	if (!playerContainer) return false;
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

	const featureMenuConfig = getFeatureMenuConfig();
	const openType = featureMenuConfig?.openType ?? "click";
	void waitForAllElements([menuId, menuButtonId]).then(() => {
		cleanupFeatureMenuListeners = () => {
			window.removeEventListener("resize", updateMenuPosition);
			window.removeEventListener("yte-feature-menu-resized", updateMenuPosition);
			resizeObserver.disconnect();
		};
		const listenersCleanup = bindFeatureMenuEventListeners(openType);
		const origCleanup = cleanupFeatureMenuListeners;
		cleanupFeatureMenuListeners = () => {
			window.removeEventListener("resize", updateMenuPosition);
			window.removeEventListener("yte-feature-menu-resized", updateMenuPosition);
			resizeObserver.disconnect();
			listenersCleanup();
			origCleanup?.();
		};
		return undefined;
	});
	return document.querySelector(menuButtonId) !== null;
}

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

function featureMenuClickListener<Toggle extends boolean>(
	buttonName: AllButtonNames,
	menuItem: HTMLDivElement,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	const newState = !getMenuItemChecked(menuItem);
	setMenuItemChecked(menuItem, newState);
	updateTrackedButtonChecked(buttonName, newState);
	listener(newState);
}

// ─── Feature menu DOM ─────────────────────────────────────────────

function getMenu(): Nullable<HTMLDivElement> {
	return document.querySelector<HTMLDivElement>(menuId);
}

function getMenuItemChecked(item: HTMLDivElement) {
	return item.getAttribute("aria-checked") === "true";
}

// ─── Feature menu button ──────────────────────────────────────────

function getMenuPanel(menu: HTMLDivElement): Nullable<HTMLDivElement> {
	return menu.querySelector<HTMLDivElement>(panelId);
}

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

// ─── Menu event listeners ─────────────────────────────────────────

function setMenuItemChecked(item: HTMLDivElement, value: boolean) {
	item.setAttribute("aria-checked", String(value));
	item.classList.toggle("ytp-menuitem-checked", value);
}

function updateMenuSize(menu: HTMLDivElement, panel: HTMLDivElement) {
	menu.style.height = `${itemHeight * panel.childElementCount + menuPadding}px`;
	menu.style.width = "fit-content";
	window.dispatchEvent(new CustomEvent("yte-feature-menu-resized"));
}
