// Maximize conflicts with mini player; its CSS must not apply while mini player is active.
import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import {
	addFeatureButton,
	getFeatureButton,
	updateFeatureButtonTitle
} from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import { createTooltip } from "@/src/utils/dom/tooltip";

import { metadata } from "./index.metadata";
import { makeMaximizeTask, minimizePlayer } from "./utils";

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const isPlayerMaximized = document.body.getAttribute("yte-maximized") === "";
				await addFeatureButton(
					"maximizePlayerButton",
					placement,
					placement === "feature_menu"
						? window.i18nextInstance.t(
								(translations) =>
									translations.pages.content.features.maximizePlayerButton.button.label
							)
						: window.i18nextInstance.t(
								(translations) =>
									translations.pages.content.features.maximizePlayerButton.button.toggle[
										isPlayerMaximized ? "on" : "off"
									]
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
								(translations) =>
									translations.pages.content.features.maximizePlayerButton.button.toggle[
										checked ? "on" : "off"
									]
							)
						);
						if (checked) {
							remove();
							// A click must survive a player transition: the theater re-render can outlast
							// maximizePlayer's one-shot waits, so the maximize is retried through the seam
							// (same shape as automaticallyMaximizePlayer) instead of bailing silently.
							void registry.playerRetry(
								"maximizePlayerButton",
								[makeMaximizeTask()],
								["maximize"],
								{ interval: 300, maxAttempts: 100, overallTimeout: 30000 }
							);
						} else {
							void minimizePlayer();
						}
					},
					true,
					isPlayerMaximized,
					fullscreenPlacement,
					() => {
						const maximized = document.body.getAttribute("yte-maximized") === "";
						return placement === "feature_menu"
							? window.i18nextInstance.t(
									(translations) =>
										translations.pages.content.features.maximizePlayerButton.button.label
								)
							: window.i18nextInstance.t(
									(translations) =>
										translations.pages.content.features.maximizePlayerButton.button.toggle[
											maximized ? "on" : "off"
										]
								);
					}
				);
			},
			name: "maximizePlayerButton"
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
