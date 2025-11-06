import type { YouTubePlayerDiv } from "@/src/types";

import { getFeatureButton, modifyIconForLightTheme, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { getLayoutType, type ModifyElementAction, modifyElementsClassList } from "@/src/utils/utilities";

const theaterModeButtonPathD: Record<"legacy" | "modern", string> = {
	legacy: "m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z",
	modern:
		"M21.20 3.01L21 3H3L2.79 3.01C2.30 3.06 1.84 3.29 1.51 3.65C1.18 4.02 .99 4.50 1 5V19L1.01 19.20C1.05 19.66 1.26 20.08 1.58 20.41C1.91 20.73 2.33 20.94 2.79 20.99L3 21H21L21.20 20.98C21.66 20.94 22.08 20.73 22.41 20.41C22.73 20.08 22.94 19.66 22.99 19.20L23 19V5C23.00 4.50 22.81 4.02 22.48 3.65C22.15 3.29 21.69 3.06 21.20 3.01ZM3 15V5H21V15H3ZM16.87 6.72H16.86L16.79 6.79L13.58 10L16.79 13.20C16.88 13.30 16.99 13.37 17.11 13.43C17.23 13.48 17.37 13.51 17.50 13.51C17.63 13.51 17.76 13.48 17.89 13.43C18.01 13.38 18.12 13.31 18.21 13.21C18.31 13.12 18.38 13.01 18.43 12.89C18.48 12.76 18.51 12.63 18.51 12.50C18.51 12.37 18.48 12.23 18.43 12.11C18.37 11.99 18.30 11.88 18.20 11.79L16.41 10L18.20 8.20L18.27 8.13C18.42 7.93 18.50 7.69 18.49 7.45C18.47 7.20 18.37 6.97 18.20 6.79C18.02 6.62 17.79 6.52 17.55 6.50C17.30 6.49 17.06 6.57 16.87 6.72ZM5.79 6.79C5.60 6.98 5.50 7.23 5.50 7.5C5.50 7.76 5.60 8.01 5.79 8.20L7.58 10L5.79 11.79L5.72 11.86C5.57 12.06 5.49 12.30 5.50 12.54C5.51 12.79 5.62 13.02 5.79 13.20C5.97 13.37 6.20 13.48 6.45 13.49C6.69 13.50 6.93 13.42 7.13 13.27L7.20 13.20L10.41 10L7.20 6.79C7.01 6.60 6.76 6.50 6.5 6.50C6.23 6.50 5.98 6.60 5.79 6.79ZM3 19V17H21V19H3Z"
};

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
	const layoutType = getLayoutType();
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD[layoutType]}']`) !== null;
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
