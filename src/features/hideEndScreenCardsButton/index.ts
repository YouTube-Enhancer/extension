import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { addFeatureButton, removeFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement, type YouTubePlayerDiv } from "@/src/types";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";
import { getEndScreenCardsButtonTitle, toCheckedStateIcons } from "./utils";

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				// Get the player container element
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				if (!playerContainer) return;
				const videoData = await playerContainer.getVideoData();
				if (videoData.isLive) return;
				const endScreenCardsAreHidden = document.querySelector("body.yte-hide-end-screen-cards") !== null;
				// checked === true means the cards are hidden, for every placement.
				const handleButtonClick = (placement: ButtonPlacement, checked?: boolean) => {
					if (checked === undefined) return;
					const cardsAreHidden = checked;
					// The feature menu item keeps its static label; only the player placements are labelled by state.
					if (placement !== "feature_menu") {
						updateFeatureButtonTitle("hideEndScreenCardsButton", getEndScreenCardsButtonTitle(cardsAreHidden));
					}
					void (async () => {
						await registry.updateFeatureEnabledState("hideEndScreenCards", cardsAreHidden, { enabled: cardsAreHidden });
					})();
				};
				const featureIcon = getFeatureIcon("hideEndScreenCardsButton", placement);
				// The feature menu is given a single icon at runtime, even though the icon type is the toggle pair.
				const icon = featureIcon instanceof SVGSVGElement ? featureIcon : toCheckedStateIcons(featureIcon);
				await addFeatureButton(
					"hideEndScreenCardsButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((translations) => translations.pages.content.features.hideEndScreenCardsButton.button.label)
					:	getEndScreenCardsButtonTitle(endScreenCardsAreHidden),
					icon,
					(checked) => handleButtonClick(placement, checked),
					true,
					endScreenCardsAreHidden,
					fullscreenPlacement
				);
			},
			name: "hideEndScreenCardsButton",
			remove: async (placement) => {
				await removeFeatureButton("hideEndScreenCardsButton", placement);
				eventManager.removeEventListeners("hideEndScreenCardsButton");
			}
		}
	]
});
