import type { ToggleIcon } from "@/src/icons";
import type { ButtonPlacement } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { getFeatureButton, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { getFeatureIcon } from "@/src/icons";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { waitForAllElements } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch"] },
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
		const playerButtonChecked = enabled;
		updateHideEndScreenCardsButtonState(placement, hideEndScreenCardsIcon, playerButtonChecked);
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
const updateHideEndScreenCardsButtonState = (hideEndScreenCardsPlacement: ButtonPlacement, icon: ToggleIcon, checked: boolean) => {
	if (hideEndScreenCardsPlacement === "feature_menu") {
		const hideEndScreenCardsMenuItem = getFeatureMenuItem("hideEndScreenCardsButton");
		if (!hideEndScreenCardsMenuItem) return;
		hideEndScreenCardsMenuItem.ariaChecked = checked ? "false" : "true";
	} else {
		const hideEndScreenCardsButton = getFeatureButton("hideEndScreenCardsButton");
		if (!hideEndScreenCardsButton || !(hideEndScreenCardsButton instanceof HTMLButtonElement)) return;
		updateFeatureButtonIcon(hideEndScreenCardsButton, icon[checked ? "off" : "on"]);
		updateFeatureButtonTitle(
			"hideEndScreenCardsButton",
			window.i18nextInstance.t((translations) => translations.pages.content.features.hideEndScreenCardsButton.button.toggle[checked ? "on" : "off"])
		);
		hideEndScreenCardsButton.ariaChecked = checked ? "true" : "false";
	}
};
