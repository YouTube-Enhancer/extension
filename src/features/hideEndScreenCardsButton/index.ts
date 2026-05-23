import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement, type YouTubePlayerDiv } from "@/src/types";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

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
				const handleButtonClick = (placement: ButtonPlacement, checked?: boolean) => {
					if (checked === undefined) return;
					let shouldHideCards: boolean;
					if (placement === "feature_menu") {
						shouldHideCards = checked;
					} else {
						shouldHideCards = !checked;
						updateFeatureButtonTitle(
							"hideEndScreenCardsButton",
							window.i18nextInstance.t(
								(translations) => translations.pages.content.features.hideEndScreenCardsButton.button.toggle[checked ? "off" : "on"]
							)
						);
					}
					void (async () => {
						await registry.updateFeatureEnabledState("hideEndScreenCards", shouldHideCards, { enabled: shouldHideCards });
					})();
				};
				await addFeatureButton(
					"hideEndScreenCardsButton",
					placement,
					window.i18nextInstance.t((translations) =>
						placement === "feature_menu" ?
							translations.pages.content.features.hideEndScreenCardsButton.button.label
						:	translations.pages.content.features.hideEndScreenCardsButton.button.toggle[endScreenCardsAreHidden ? "on" : "off"]
					),
					getFeatureIcon("hideEndScreenCardsButton", placement),
					(checked) => handleButtonClick(placement, checked),
					true,
					!endScreenCardsAreHidden,
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
