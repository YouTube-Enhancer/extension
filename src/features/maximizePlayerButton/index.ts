import "./index.css";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { createTooltip } from "@/src/utils/dom/tooltip";

import { metadata } from "./index.metadata";
import { maximizePlayer, minimizePlayer } from "./utils";

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const isPlayerMaximized = document.body.getAttribute("yte-maximized") === "";
				await addFeatureButton(
					"maximizePlayerButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((translations) => translations.pages.content.features.maximizePlayerButton.button.label)
					:	window.i18nextInstance.t(
							(translations) => translations.pages.content.features.maximizePlayerButton.button.toggle[isPlayerMaximized ? "on" : "off"]
						),
					getFeatureIcon("maximizePlayerButton", placement),
					(checked) => {
						if (checked === undefined) return;
						const button = getFeatureButton("maximizePlayerButton");
						if (!button) return;
						const featureName = "maximizePlayerButton";
						const { remove } = createTooltip({
							direction: placement === "below_player" ? "down" : "up",
							element: button,
							featureName,
							id: `yte-feature-${featureName}-tooltip`
						});
						updateFeatureButtonTitle(
							"maximizePlayerButton",
							window.i18nextInstance.t(
								(translations) => translations.pages.content.features.maximizePlayerButton.button.toggle[checked ? "on" : "off"]
							)
						);
						if (checked) {
							remove();
							void maximizePlayer();
						} else {
							void minimizePlayer();
						}
					},
					true,
					isPlayerMaximized,
					fullscreenPlacement
				);
			},
			name: "maximizePlayerButton",
			remove: async (placement) => {
				await removeFeatureButton("maximizePlayerButton", placement);
				eventManager.removeEventListeners("maximizePlayerButton");
			}
		}
	],
	state: {
		header: {
			timeout: null,
			visible: true
		},
		isProgrammaticClick: false,
		listenersAttached: false
	}
});
