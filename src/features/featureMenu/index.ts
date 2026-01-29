import type { FeatureMenuOpenType } from "@/src/types";

import "./index.css";

import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createSVGElement, createTooltip, isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

const MENU_ID = "#yte-feature-menu";
const BUTTON_ID = "#yte-feature-menu-button";

export async function enableFeatureMenu() {
	if (document.querySelector(BUTTON_ID)) return;
	await createFeatureMenuButton();
}

export function setupFeatureMenuEventListeners(featureMenuOpenType: FeatureMenuOpenType) {
	eventManager.removeEventListeners("featureMenu");
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const playerContainer = isWatchPage() ? document.querySelector<HTMLDivElement>("#movie_player") : null;
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	const featureMenu = document.querySelector<HTMLDivElement>(MENU_ID);
	const featureMenuButton = document.querySelector<HTMLButtonElement>(BUTTON_ID);
	if (!settingsButton || !playerContainer || !bottomControls || !featureMenu || !featureMenuButton) return;
	const { listener: showFeatureMenuTooltip, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-featureMenu-tooltip"
	});

	let menuVisible = false;

	const hideYouTubeSettings = () => {
		const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
		if (settingsMenu && settingsMenu.style.display !== "none") settingsButton.click();
	};
	const showFeatureMenu = () => {
		if (menuVisible) return;
		menuVisible = true;
		adjustAdsContainerStyles(true);
		bottomControls.style.opacity = "1";
		featureMenu.style.display = "block";
	};
	const hideFeatureMenu = () => {
		if (!menuVisible) return;
		menuVisible = false;
		adjustAdsContainerStyles(false);
		featureMenu.style.display = "none";
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
		case "hover":
			eventManager.addEventListener(
				featureMenuButton,
				"mouseover",
				() => {
					hideYouTubeSettings();
					showFeatureMenuTooltip();
					showFeatureMenu();
				},
				"featureMenu"
			);
			eventManager.addEventListener(
				featureMenuButton,
				"mouseleave",
				(e) => {
					if (!(e instanceof MouseEvent)) return;
					const rt = e.relatedTarget as Node | null;
					if (rt && (rt === featureMenu || rt === featureMenuButton || featureMenu.contains(rt))) return;
					removeFeatureMenuTooltip();
					hideFeatureMenu();
				},
				"featureMenu"
			);
			eventManager.addEventListener(
				featureMenu,
				"mouseleave",
				() => {
					removeFeatureMenuTooltip();
					hideFeatureMenu();
				},
				"featureMenu"
			);
			eventManager.addEventListener(
				playerContainer,
				"mouseleave",
				() => {
					removeFeatureMenuTooltip();
					hideFeatureMenu();
				},
				"featureMenu"
			);
			eventManager.addEventListener(document.documentElement, "click", clickOutsideListener, "featureMenu");
			break;
	}

	const observer = new MutationObserver((mutations) => {
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
		styles: { display: "none", zIndex: "2050" }
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
		styles: { display: "none" }
	});
	featureMenuButton.dataset.title = window.i18nextInstance.t((translations) => translations.pages.content.features.featureMenu.button.label);
	featureMenuButton.appendChild(makeFeatureMenuIcon());

	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const playerContainer = isWatchPage() ? document.querySelector<HTMLDivElement>("#movie_player") : null;
	if (!settingsButton || !playerContainer) return;
	settingsButton.insertAdjacentElement("beforebegin", featureMenuButton);
	playerContainer.insertAdjacentElement("afterbegin", featureMenu);
	const {
		data: {
			options: { feature_menu_open_type: featureMenuOpenType }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await waitForAllElements([MENU_ID, BUTTON_ID]);
	setupFeatureMenuEventListeners(featureMenuOpenType);
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
