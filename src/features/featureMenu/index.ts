import type { FeatureMenuOpenType } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createSVGElement, createTooltip, isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { isNewYouTubeVideoLayout } from "../../utils/utilities";

// Function to enable the feature menu
export async function enableFeatureMenu() {
	const featureMenuButtonExists = document.querySelector("#yte-feature-menu-button") !== null;
	if (featureMenuButtonExists) return;
	await createFeatureMenuButton();
}

export function setupFeatureMenuEventListeners(featureMenuOpenType: FeatureMenuOpenType) {
	eventManager.removeEventListeners("featureMenu");
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	if (!settingsButton) return;
	const playerContainer =
		isWatchPage() ?
			document.querySelector<HTMLDivElement>(
				isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy"
			)
		:	null;
	if (!playerContainer) return;
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	if (!bottomControls) return;
	const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
	if (!featureMenu) return;
	const featureMenuButton = document.querySelector<HTMLButtonElement>("#yte-feature-menu-button");
	if (!featureMenuButton) return;
	const { listener: showFeatureMenuTooltip, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-featureMenu-tooltip"
	});
	const hideYouTubeSettings = () => {
		const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
		if (!settingsMenu) return;
		if (settingsMenu.style.display === "none") return;
		settingsButton.click();
	};
	const showFeatureMenu = () => {
		if (featureMenu.style.display !== "none") return;
		adjustAdsContainerStyles(true);
		bottomControls.style.opacity = "1";
		featureMenu.style.display = "block";
	};
	const hideFeatureMenu = () => {
		if (featureMenu.style.display === "none") return;
		adjustAdsContainerStyles(false);
		featureMenu.style.display = "none";
		bottomControls.style.opacity = "";
	};
	const clickOutsideListener = (event: Event) => {
		if (!featureMenuButton) return;
		if (event.target === featureMenuButton) return;
		if (event.target === featureMenu) return;
		if (featureMenu.contains(event.target as Node)) return;
		hideFeatureMenu();
	};

	switch (featureMenuOpenType) {
		case "click": {
			eventManager.addEventListener(document.documentElement, "click", clickOutsideListener, "featureMenu");
			eventManager.addEventListener(
				featureMenuButton,
				"click",
				() => {
					const featureMenuVisible = featureMenu.style.display === "block";
					if (featureMenuVisible) return hideFeatureMenu();
					showFeatureMenu();
				},
				"featureMenu"
			);
			eventManager.addEventListener(featureMenuButton, "mouseleave", removeFeatureMenuTooltip, "featureMenu");
			eventManager.addEventListener(featureMenuButton, "mouseover", showFeatureMenuTooltip, "featureMenu");
			break;
		}
		case "hover": {
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
				(event) => {
					if ([featureMenu, featureMenuButton].includes(event.target as HTMLButtonElement)) return;
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
	}
	function handleMutation(mutations: MutationRecord[]) {
		mutations.forEach((mutation) => {
			if (mutation.type !== "childList") return;
			const addedNodes = Array.from(mutation.addedNodes);
			const isAdsElementAdded = addedNodes.some(
				(node) => (node as HTMLDivElement).classList?.contains("video-ads") && (node as HTMLDivElement).classList?.contains("ytp-ad-module")
			);
			if (!isAdsElementAdded) return;
			const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
			if (!featureMenu) return;
			adjustAdsContainerStyles(featureMenu.style.display === "block");
		});
	}
	const observer = new MutationObserver(handleMutation);
	observer.observe(playerContainer, {
		childList: true,
		subtree: true
	});
}
function adjustAdsContainerStyles(featureMenuOpen: boolean) {
	const adsContainer = document.querySelector<HTMLDivElement>("div.video-ads.ytp-ad-module");
	if (!adsContainer) return;
	const adsSpan = adsContainer.querySelector<HTMLSpanElement>("span.ytp-ad-preview-container");
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
		styles: {
			display: "none",
			zIndex: "2050"
		}
	});
	// Create the feature menu panel
	const featureMenuPanel = createStyledElement({
		classlist: ["ytp-panel"],
		elementId: "yte-feature-menu-panel",
		elementType: "div",
		styles: {
			display: "contents"
		}
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
	// Check if the feature menu already exists
	const featureMenuExists = document.querySelector<HTMLDivElement>("#yte-feature-menu") !== null;
	const featureMenu = featureMenuExists ? (document.querySelector("#yte-feature-menu") as HTMLDivElement) : createFeatureMenu();
	// Create the feature menu button
	const featureMenuButton = createStyledElement({
		classlist: ["ytp-button"],
		elementId: "yte-feature-menu-button",
		elementType: "button",
		styles: { display: "none" }
	});
	featureMenuButton.dataset.title = window.i18nextInstance.t("pages.content.features.featureMenu.button.label");
	// Create the SVG icon for the button
	const featureButtonSVG = makeFeatureMenuIcon();
	featureMenuButton.appendChild(featureButtonSVG);
	// Get references to various elements and check their existence
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	if (!settingsButton) return;
	const playerContainer =
		isWatchPage() ?
			document.querySelector<HTMLDivElement>(
				isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy"
			)
		:	null;
	if (!playerContainer) return;
	// Insert the feature menu button and feature menu itself
	settingsButton.insertAdjacentElement("beforebegin", featureMenuButton);
	playerContainer.insertAdjacentElement("afterbegin", featureMenu);
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { feature_menu_open_type: featureMenuOpenType }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await waitForAllElements(["#yte-feature-menu", "#yte-feature-menu-button"]);
	setupFeatureMenuEventListeners(featureMenuOpenType);
}
function makeFeatureMenuIcon() {
	const featureButtonSVG = createSVGElement(
		"svg",
		{
			fill: "white",
			height: "48px",
			viewBox: "0 0 36 36",
			width: "48px"
		},
		createSVGElement("path", {
			d: "M 9.1273596,13.56368 H 13.56368 V 9.1273596 H 9.1273596 Z M 15.78184,26.872641 h 4.43632 V 22.43632 h -4.43632 z m -6.6544804,0 H 13.56368 V 22.43632 H 9.1273596 Z m 0,-6.654481 H 13.56368 V 15.78184 H 9.1273596 Z m 6.6544804,0 h 4.43632 V 15.78184 H 15.78184 Z M 22.43632,9.1273596 V 13.56368 h 4.436321 V 9.1273596 Z M 15.78184,13.56368 h 4.43632 V 9.1273596 h -4.43632 z m 6.65448,6.65448 h 4.436321 V 15.78184 H 22.43632 Z m 0,6.654481 h 4.436321 V 22.43632 H 22.43632 Z",
			fill: "white"
		})
	);
	return featureButtonSVG;
}
