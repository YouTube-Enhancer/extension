import type { ToggleIcon } from "@/src/icons";
import type { ButtonPlacement } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { updateFeatureButtonChecked, updateFeatureButtonIconByName, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { getEndScreenCardsButtonIcon, getEndScreenCardsButtonTitle } from "@/src/features/hideEndScreenCardsButton/utils";
import { getFeatureIcon } from "@/src/icons";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: ({ enabled }) => {
		const {
			button: { placement }
		} = featureConfigManager.getLast("hideEndScreenCardsButton");
		const hideEndScreenCardsIcon = getFeatureIcon("hideEndScreenCardsButton", "below_player");
		if (hideEndScreenCardsIcon instanceof SVGSVGElement) return;
		// The button convention is aria-checked === true means the cards are hidden, which is exactly the feature's enabled state.
		const cardsAreHidden = enabled;
		updateHideEndScreenCardsButtonState(placement, hideEndScreenCardsIcon, cardsAreHidden);
	},
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-end-screen-cards",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-end-screen-cards",
			element: document.body
		});
	}
});
const updateHideEndScreenCardsButtonState = (hideEndScreenCardsPlacement: ButtonPlacement, icons: ToggleIcon, cardsAreHidden: boolean) => {
	/**
	 * The controller keeps aria-checked, the menu item's checked class and the tracked record (which a relocated
	 * button is rebuilt from) in step, so an external toggle goes through it instead of writing the attribute itself.
	 */
	updateFeatureButtonChecked("hideEndScreenCardsButton", cardsAreHidden);
	if (hideEndScreenCardsPlacement === "feature_menu") return;
	const icon = getEndScreenCardsButtonIcon(icons, cardsAreHidden);
	if (icon instanceof SVGSVGElement) updateFeatureButtonIconByName("hideEndScreenCardsButton", icon);
	updateFeatureButtonTitle("hideEndScreenCardsButton", getEndScreenCardsButtonTitle(cardsAreHidden));
};
