import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import type { ButtonPlacement } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { modifyElementsClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export async function enableHideEndScreenCards() {
	const {
		data: {
			options: { enable_hide_end_screen_cards: enableHideEndScreenCards }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideEndScreenCards) return;
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	hideEndScreenCards();
}

export async function disableHideEndScreenCards() {
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	showEndScreenCards();
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
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
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
	await removeFeatureButton("hideEndScreenCardsButton", placement);
	eventManager.removeEventListeners("hideEndScreenCardsButton");
};
function hideEndScreenCards() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
}
function showEndScreenCards() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
}
export function isEndScreenCardsHidden(): boolean {
	const endCards = document.querySelectorAll(".ytp-ce-element.yte-hide-end-screen-cards");
	return endCards.length > 0;
}
