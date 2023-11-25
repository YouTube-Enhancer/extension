import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createTooltip, isShortsPage, isWatchPage } from "@/src/utils/utilities";

function createFeatureMenu() {
	// Create the feature menu div
	const featureMenu = createStyledElement({
		classlist: ["ytp-popup", "ytp-settings-menu"],
		elementId: "yte-feature-menu",
		elementType: "div",
		styles: {
			display: "none"
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

function createFeatureMenuButton() {
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
	featureMenuButton.dataset.title = window.i18nextInstance.t("pages.content.features.featureMenu.label");
	// Create the SVG icon for the button
	const featureButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	const featureButtonSVGPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	featureButtonSVG.setAttribute("viewBox", "0 0 36 36");
	featureButtonSVG.setAttribute("height", "48px");
	featureButtonSVG.setAttribute("width", "48px");
	featureButtonSVG.setAttribute("fill", "white");
	featureButtonSVGPath.setAttribute(
		"d",
		"M 9.1273596,13.56368 H 13.56368 V 9.1273596 H 9.1273596 Z M 15.78184,26.872641 h 4.43632 V 22.43632 h -4.43632 z m -6.6544804,0 H 13.56368 V 22.43632 H 9.1273596 Z m 0,-6.654481 H 13.56368 V 15.78184 H 9.1273596 Z m 6.6544804,0 h 4.43632 V 15.78184 H 15.78184 Z M 22.43632,9.1273596 V 13.56368 h 4.436321 V 9.1273596 Z M 15.78184,13.56368 h 4.43632 V 9.1273596 h -4.43632 z m 6.65448,6.65448 h 4.436321 V 15.78184 H 22.43632 Z m 0,6.654481 h 4.436321 V 22.43632 H 22.43632 Z"
	);
	featureButtonSVGPath.setAttribute("fill", "white");
	featureButtonSVG.appendChild(featureButtonSVGPath);
	featureMenuButton.appendChild(featureButtonSVG);

	// Get references to various elements and check their existence
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	if (!settingsButton) return;
	const playerContainer = isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player") : isShortsPage() ? null : null;
	if (!playerContainer) return;
	const bottomControls = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	if (!bottomControls) return;

	// Create a tooltip for the feature menu button
	const { listener: featureMenuButtonMouseOverListener, remove: removeFeatureMenuTooltip } = createTooltip({
		element: featureMenuButton,
		featureName: "featureMenu",
		id: "yte-feature-menu-tooltip"
	});

	// Event listeners for showing and hiding the feature menu
	eventManager.addEventListener(
		featureMenuButton,
		"click",
		() => {
			const featureMenuVisible = featureMenu.style.display === "block";
			if (featureMenuVisible) {
				bottomControls.style.opacity = "";
				featureMenu.style.display = "none";
				featureMenuButtonMouseOverListener();
			} else {
				removeFeatureMenuTooltip();
				bottomControls.style.opacity = "1";
				featureMenu.style.display = "block";
			}
		},
		"featureMenu"
	);

	eventManager.addEventListener(
		featureMenuButton,
		"mouseover",
		() => {
			const featureMenuVisible = featureMenu.style.display === "block";
			if (featureMenuVisible) return;
			featureMenuButtonMouseOverListener();
		},
		"featureMenu"
	);

	eventManager.addEventListener(
		featureMenuButton,
		"mouseleave",
		() => {
			const featureMenuVisible = featureMenu.style.display === "block";
			if (featureMenuVisible) return;
			removeFeatureMenuTooltip();
		},
		"featureMenu"
	);

	// Event listener to hide the menu when clicking outside
	document.addEventListener("click", (event) => {
		if (!featureMenuButton) return;
		if (event.target === featureMenuButton) return;
		if (event.target === featureMenu) return;
		if (!featureMenu.contains(event.target as Node)) {
			featureMenu.style.display = "none";
			bottomControls.style.opacity = "";
		}
	});

	// Insert the feature menu button and feature menu itself
	settingsButton.insertAdjacentElement("beforebegin", featureMenuButton);
	playerContainer.insertAdjacentElement("afterbegin", featureMenu);
}

// Function to enable the feature menu
export function enableFeatureMenu() {
	const featureMenuButtonExists = document.querySelector("#yte-feature-menu-button") !== null;
	if (featureMenuButtonExists) return;
	createFeatureMenuButton();
}
