import "./index.css";

import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createStyledElement, createSVGElement } from "@/src/utils/dom/elements";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isWatchPage } from "@/src/utils/url";

import type { FeatureMenuOpenType } from "./types";

const MENU_ID = "#yte-feature-menu";
const BUTTON_ID = "#yte-feature-menu-button";

export async function enableFeatureMenu() {
	if (document.querySelector(BUTTON_ID)) return;
	if (window.cleanupFeatureMenuListeners) window.cleanupFeatureMenuListeners();
	window.cleanupFeatureMenuListeners = await createFeatureMenuButton();
}

export function setupFeatureMenuEventListeners(featureMenuOpenType: FeatureMenuOpenType): () => void {
	eventManager.removeEventListeners("featureMenu");
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const playerContainer = isWatchPage() ? document.querySelector<HTMLDivElement>("#movie_player") : null;
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	const featureMenu = document.querySelector<HTMLDivElement>(MENU_ID);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(BUTTON_ID);
	if (!settingsButton || !playerContainer || !bottomControls || !featureMenu || !featureMenuButton) return () => {};
	const { listener: showFeatureMenuTooltip, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-featureMenu-tooltip"
	});

	let menuVisible = false;
	let observer: MutationObserver | null = null;

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

	// Return cleanup function
	return () => {
		eventManager.removeEventListeners("featureMenu");
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	};
}

function adjustAdsContainerStyles(featureMenuOpen: boolean) {
	const adsSpan = document.querySelector<HTMLSpanElement>("div.video-ads.ytp-ad-module span.ytp-ad-preview-container");
	if (!adsSpan) return;
	adsSpan.style.opacity = featureMenuOpen ? "0.4" : "";
	adsSpan.style.zIndex = featureMenuOpen ? "36" : "";
}

function createFeatureMenu() {
	// Create the feature menu div
	const featureMenu = createStyledElement({
		classlist: ["ytp-popup", "ytp-settings-menu"],
		elementId: "yte-feature-menu",
		elementType: "div",
		styles: { display: "block", visibility: "hidden", zIndex: "2050" }
	});
	// Create the feature menu panel
	const featureMenuPanel = createStyledElement({
		classlist: ["ytp-panel"],
		elementId: "yte-feature-menu-panel",
		elementType: "div",
		styles: { display: "contents" }
	});
	// Append the panel to the menu
	featureMenu.appendChild(featureMenuPanel);
	// Create the panel menu
	const featureMenuPanelMenu = createStyledElement({
		classlist: ["ytp-panel-menu"],
		elementId: "yte-panel-menu",
		elementType: "div"
	});
	featureMenuPanel.appendChild(featureMenuPanelMenu);
	return featureMenu;
}
async function createFeatureMenuButton() {
	const existingMenu = document.querySelector<HTMLDivElement>(MENU_ID);
	const featureMenu = existingMenu ?? createFeatureMenu();

	const featureMenuButton = createStyledElement({
		classlist: ["ytp-button"],
		elementId: "yte-feature-menu-button",
		elementType: "button",
		styles: { display: "none", visibility: "hidden" }
	});
	featureMenuButton.dataset.title = window.i18nextInstance.t((translations) => translations.pages.content.features.featureMenu.button.label);
	featureMenuButton.appendChild(makeFeatureMenuIcon());
	const rightControls = await waitForElement<HTMLDivElement>(".ytp-right-controls");
	if (!rightControls) return () => {};
	const containerId = "yte-right-controls-container";
	let container = rightControls.querySelector<HTMLDivElement>(`#${containerId}`);
	if (!container) {
		container = createStyledElement({
			elementId: containerId,
			elementType: "div",
			styles: { alignItems: "center", display: "flex" }
		});
		const leftSide = rightControls.querySelector<HTMLDivElement>(".ytp-right-controls-left");
		if (leftSide) leftSide.insertAdjacentElement("beforebegin", container);
		else rightControls.prepend(container);
	}
	container.insertAdjacentElement("afterend", featureMenuButton);

	const playerContainer = isWatchPage() ? document.querySelector<HTMLDivElement>("#movie_player") : null;
	if (!playerContainer) return () => {};
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
	await waitForAllElements([MENU_ID, BUTTON_ID]);
	const cleanup = setupFeatureMenuEventListeners(openType);
	return () => {
		window.removeEventListener("resize", updateMenuPosition);
		window.removeEventListener("yte-feature-menu-resized", updateMenuPosition);
		resizeObserver.disconnect();
		cleanup();
	};
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
