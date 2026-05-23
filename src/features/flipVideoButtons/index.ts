import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { flipVideoVertical } from "@/src/features/flipVideoButtons/utils";
import { getFeatureIcon } from "@/src/icons";

import { metadata } from "./index.metadata";
import { flipVideoHorizontal } from "./utils";

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({
				buttons: {
					flipVideoHorizontalButton: { fullscreenPlacement, placement }
				}
			}) => {
				await addFeatureButton(
					"flipVideoHorizontalButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.flipVideoHorizontalButton.button.label),
					getFeatureIcon("flipVideoHorizontalButton", placement),
					() => flipVideoHorizontal(),
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "flipVideoHorizontalButton",
			remove: async (placement) => {
				await removeFeatureButton("flipVideoHorizontalButton", placement);
			}
		},
		{
			add: async ({
				buttons: {
					flipVideoVerticalButton: { fullscreenPlacement, placement }
				}
			}) => {
				await addFeatureButton(
					"flipVideoVerticalButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.flipVideoVerticalButton.button.label),
					getFeatureIcon("flipVideoVerticalButton", placement),
					() => flipVideoVertical(),
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "flipVideoVerticalButton",
			remove: async (placement) => {
				await removeFeatureButton("flipVideoVerticalButton", placement);
			}
		}
	]
});
