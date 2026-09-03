import type { ToggleIcon } from "@/src/icons";
import type { ButtonPlacement } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { getFeatureButton, getFeatureMenuItem, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { getEndScreenCardsButtonIcon, getEndScreenCardsButtonTitle } from "@/src/features/hideEndScreenCardsButton/utils";
import { getFeatureIcon } from "@/src/icons";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { waitForAllElements } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: async ({ enabled }) => {
		const {
			data: {
				options: {
					hideEndScreenCardsButton: {
						button: { placement }
					}
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		const hideEndScreenCardsIcon = getFeatureIcon("hideEndScreenCardsButton", "below_player");
		if (hideEndScreenCardsIcon instanceof SVGSVGElement) return;
		// The button convention is aria-checked === true means the cards are hidden, which is exactly the feature's enabled state.
		const cardsAreHidden = enabled;
		updateHideEndScreenCardsButtonState(placement, hideEndScreenCardsIcon, cardsAreHidden);
	},
	onDisable: async () => {
		await waitForAllElements(["div#player", "div#player-container:has(#movie_player)"]);
		modifyElementClassList("remove", {
			className: "yte-hide-end-screen-cards",
			element: document.body
		});
	},
	onEnable: async () => {
		await waitForAllElements(["div#player", "div#player-container:has(#movie_player)"]);
		modifyElementClassList("add", {
			className: "yte-hide-end-screen-cards",
			element: document.body
		});
	}
});
const updateHideEndScreenCardsButtonState = (hideEndScreenCardsPlacement: ButtonPlacement, icons: ToggleIcon, cardsAreHidden: boolean) => {
	if (hideEndScreenCardsPlacement === "feature_menu") {
		const hideEndScreenCardsMenuItem = getFeatureMenuItem("hideEndScreenCardsButton");
		if (!hideEndScreenCardsMenuItem) return;
		hideEndScreenCardsMenuItem.ariaChecked = cardsAreHidden ? "true" : "false";
		// The shared controller pairs aria-checked with this class, so an external toggle has to keep them together.
		hideEndScreenCardsMenuItem.classList.toggle("ytp-menuitem-checked", cardsAreHidden);
	} else {
		const hideEndScreenCardsButton = getFeatureButton("hideEndScreenCardsButton");
		if (!hideEndScreenCardsButton || !(hideEndScreenCardsButton instanceof HTMLButtonElement)) return;
		updateFeatureButtonIcon(hideEndScreenCardsButton, getEndScreenCardsButtonIcon(icons, cardsAreHidden));
		updateFeatureButtonTitle("hideEndScreenCardsButton", getEndScreenCardsButtonTitle(cardsAreHidden));
		hideEndScreenCardsButton.ariaChecked = cardsAreHidden ? "true" : "false";
	}
};
