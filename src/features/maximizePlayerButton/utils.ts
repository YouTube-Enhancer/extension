import type { YouTubePlayerDiv } from "@/src/types";

import { getFeatureButton, modifyIconForLightTheme, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { type ModifyElementAction, modifyElementsClassList } from "@/src/utils/utilities";

const theaterModeButtonPathD =
	"M21.20 3.01L21 3H3L2.79 3.01C2.30 3.06 1.84 3.29 1.51 3.65C1.18 4.02 .99 4.50 1 5V19L1.01 19.20C1.05 19.66 1.26 20.08 1.58 20.41C1.91 20.73 2.33 20.94 2.79 20.99L3 21H21L21.20 20.98C21.66 20.94 22.08 20.73 22.41 20.41C22.73 20.08 22.94 19.66 22.99 19.20L23 19V5C23.00 4.50 22.81 4.02 22.48 3.65C22.15 3.29 21.69 3.06 21.20 3.01ZM3 15V5H21V15H3ZM7.87 6.72L7.79 6.79L4.58 10L7.79 13.20C7.88 13.30 7.99 13.37 8.11 13.43C8.23 13.48 8.37 13.51 8.50 13.51C8.63 13.51 8.76 13.48 8.89 13.43C9.01 13.38 9.12 13.31 9.21 13.21C9.31 13.12 9.38 13.01 9.43 12.89C9.48 12.76 9.51 12.63 9.51 12.50C9.51 12.37 9.48 12.23 9.43 12.11C9.37 11.99 9.30 11.88 9.20 11.79L7.41 10L9.20 8.20L9.27 8.13C9.42 7.93 9.50 7.69 9.48 7.45C9.47 7.20 9.36 6.97 9.19 6.80C9.02 6.63 8.79 6.52 8.54 6.51C8.30 6.49 8.06 6.57 7.87 6.72ZM14.79 6.79C14.60 6.98 14.50 7.23 14.50 7.5C14.50 7.76 14.60 8.01 14.79 8.20L16.58 10L14.79 11.79L14.72 11.86C14.57 12.06 14.49 12.30 14.50 12.54C14.51 12.79 14.62 13.02 14.79 13.20C14.97 13.37 15.20 13.48 15.45 13.49C15.69 13.50 15.93 13.42 16.13 13.27L16.20 13.20L19.41 10L16.20 6.79C16.01 6.60 15.76 6.50 15.5 6.50C15.23 6.50 14.98 6.60 14.79 6.79ZM3 19V17H21V19H3Z";

let isProgrammaticClick = false;
let listenersInitialized = false;

export function maximizePlayer() {
	const videoPlayer = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoPlayer) return;
	const chromeBottom = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	if (!chromeBottom) return;
	const leftControls = chromeBottom.querySelector<HTMLDivElement>("div.ytp-left-controls");
	const rightControls = chromeBottom.querySelector<HTMLDivElement>("div.ytp-right-controls");
	if (!leftControls || !rightControls) return;
	const pipElement = document.querySelector<HTMLButtonElement>("button.ytp-pip-button");
	const miniPlayerElement = document.querySelector<HTMLButtonElement>("button.ytp-miniplayer-button");
	const sizeElement = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeElement) return;
	const inTheaterMode = document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD}']`) === null;
	document.body.setAttribute("yte-size-button-state", inTheaterMode ? "theater" : "default");
	if (!inTheaterMode && sizeElement) clickAndRestore(sizeElement);
	adjustPlayer("add");
	if (!listenersInitialized) {
		listenersInitialized = true;
		[pipElement, sizeElement, miniPlayerElement].forEach((element) => {
			if (!element) return;
			eventManager.addEventListener(
				element,
				"click",
				async () => {
					if (isProgrammaticClick) return;
					minimizePlayer();
					const maximizePlayerButton = getFeatureButton("maximizePlayerButton");
					if (!maximizePlayerButton) return;
					maximizePlayerButton.ariaChecked = "false";
					const button = getFeatureButton("maximizePlayerButton");
					const icon = getFeatureIcon("maximizePlayerButton", "player_controls_left");
					if (button && button instanceof HTMLButtonElement) {
						if (typeof icon === "object" && "off" in icon && "on" in icon)
							updateFeatureButtonIcon(button, await modifyIconForLightTheme(icon.off, true));
						updateFeatureButtonTitle(
							"maximizePlayerButton",
							window.i18nextInstance.t("pages.content.features.maximizePlayerButton.button.toggle.off")
						);
					}
				},
				"maximizePlayerButton"
			);
		});
	}
}

export function minimizePlayer() {
	const lastState = document.body.getAttribute("yte-size-button-state");
	const sizeElement = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (lastState === "default" && sizeElement) clickAndRestore(sizeElement);
	document.body.removeAttribute("yte-size-button-state");
	adjustPlayer("remove");
}

function adjustPlayer(action: ModifyElementAction) {
	switch (action) {
		case "add":
			document.body.style.overflow = "hidden";
			document.body.setAttribute("yte-maximized", "");
			break;
		case "remove":
			document.body.style.overflow = "";
			document.body.removeAttribute("yte-maximized");
			break;
	}

	modifyElementsClassList(action, [
		{
			className: "yte-maximized-video",
			element: document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video")
		},
		{
			className: "yte-maximized-video-container",
			element: document.querySelector<YouTubePlayerDiv>("#movie_player")
		},
		{
			className: "yte-maximized-width",
			element: document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom")
		},
		{
			className: "yte-maximized-width",
			element: document.querySelector<HTMLDivElement>(".ytp-chapter-hover-container")
		}
	]);
}

function clickAndRestore(sizeElement: HTMLButtonElement) {
	const original = {
		ariaLabel: sizeElement.getAttribute("aria-label") ?? "",
		d: sizeElement.querySelector("svg path")?.getAttribute("d") ?? "",
		titleNoTooltip: sizeElement.getAttribute("data-title-no-tooltip") ?? "",
		tooltipTitle: sizeElement.getAttribute("data-tooltip-title") ?? ""
	};
	isProgrammaticClick = true;
	sizeElement.click();
	setTimeout(() => {
		const newButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
		if (!newButton) {
			isProgrammaticClick = false;
			return;
		}
		const path = newButton.querySelector("svg path");
		if (path) path.setAttribute("d", original.d);
		newButton.setAttribute("aria-label", original.ariaLabel);
		newButton.setAttribute("data-title-no-tooltip", original.titleNoTooltip);
		newButton.setAttribute("data-tooltip-title", original.tooltipTitle);
		isProgrammaticClick = false;
	}, 50);
}
