import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import type { ButtonPlacement, YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { getFeatureIcon, type ToggleIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";

import "./index.css";
import { isWatchPage, modifyElementsClassList, waitForAllElements, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";
export async function disableHideEndScreenCards() {
	if (!isWatchPage()) return;
	await waitForAllElements(["div#player", "div#player-container"]);
	showEndScreenCards();
}

export async function enableHideEndScreenCards() {
	const {
		data: {
			options: { enable_hide_end_screen_cards: enableHideEndScreenCards }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideEndScreenCards) return;
	if (!isWatchPage()) return;
	await waitForAllElements(["div#player", "div#player-container"]);
	hideEndScreenCards();
}
export const addHideEndScreenCardsButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { hideEndScreenCardsButton: hideEndScreenCardsButtonPlacement },
				enable_hide_end_screen_cards_button: enableHideEndScreenCardsButton
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideEndScreenCardsButton) return;
	if (!isWatchPage()) return;
	// Get the player container element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const videoData = await playerContainer.getVideoData();
	if (videoData.isLive) return;
	const endScreenCardsAreHidden = isEndScreenCardsHidden();
	const handleButtonClick = (placement: ButtonPlacement, checked?: boolean) => {
		if (placement === "feature_menu") {
			if (checked && !isEndScreenCardsHidden()) hideEndScreenCards();
			else if (!checked && isEndScreenCardsHidden()) showEndScreenCards();
		} else {
			updateFeatureButtonTitle(
				"hideEndScreenCardsButton",
				window.i18nextInstance.t(`pages.content.features.hideEndScreenCardsButton.button.toggle.${checked ? "on" : "off"}`)
			);
			if (checked && isEndScreenCardsHidden()) showEndScreenCards();
			else if (!checked && !isEndScreenCardsHidden()) hideEndScreenCards();
		}
	};
	await addFeatureButton(
		"hideEndScreenCardsButton",
		hideEndScreenCardsButtonPlacement,
		window.i18nextInstance.t(
			hideEndScreenCardsButtonPlacement === "feature_menu" ?
				"pages.content.features.hideEndScreenCardsButton.button.label"
			:	`pages.content.features.hideEndScreenCardsButton.button.toggle.${!endScreenCardsAreHidden ? "on" : "off"}`
		),
		getFeatureIcon("hideEndScreenCardsButton", hideEndScreenCardsButtonPlacement),
		(checked) => handleButtonClick(hideEndScreenCardsButtonPlacement, checked),
		true,
		hideEndScreenCardsButtonPlacement !== "feature_menu" ? !endScreenCardsAreHidden : endScreenCardsAreHidden
	);
};
export const removeHideEndScreenCardsButton: RemoveButtonFunction = async (placement) => {
	if (!isWatchPage()) return;
	await removeFeatureButton("hideEndScreenCardsButton", placement);
	eventManager.removeEventListeners("hideEndScreenCardsButton");
};
export function isEndScreenCardsHidden(): boolean {
	const endCards = document.querySelectorAll(".ytp-ce-element.yte-hide-end-screen-cards");
	return endCards.length > 0;
}
function hideEndScreenCards() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
	modifyElementsClassList("add", [
		{
			className: "yte-hide-end-screen-cards",
			element: document.querySelector(".ytp-ce-hide-button-container")
		}
	]);
}
function showEndScreenCards() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
	modifyElementsClassList("remove", [
		{
			className: "yte-hide-end-screen-cards",
			element: document.querySelector(".ytp-ce-hide-button-container")
		}
	]);
}
export const updateHideEndScreenCardsButtonState = (hideEndScreenCardsPlacement: ButtonPlacement, icon: ToggleIcon, checked: boolean) => {
	if (hideEndScreenCardsPlacement === "feature_menu") {
		const hideEndScreenCardsMenuItem = getFeatureMenuItem("hideEndScreenCardsButton");
		if (!hideEndScreenCardsMenuItem) return;
		hideEndScreenCardsMenuItem.ariaChecked = checked ? "false" : "true";
	} else {
		const hideEndScreenCardsButton = getFeatureButton("hideEndScreenCardsButton");
		if (!hideEndScreenCardsButton || !(hideEndScreenCardsButton instanceof HTMLButtonElement)) return;
		updateFeatureButtonIcon(hideEndScreenCardsButton, icon[checked ? "on" : "off"]);
		updateFeatureButtonTitle(
			"hideEndScreenCardsButton",
			window.i18nextInstance.t(`pages.content.features.hideEndScreenCardsButton.button.toggle.${checked ? "on" : "off"}`)
		);
		hideEndScreenCardsButton.ariaChecked = checked ? "true" : "false";
	}
};
