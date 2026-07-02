import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";

import { metadata } from "./index.metadata";
import { disableMonoToStereo, enableMonoToStereo, isMonoStereoEnabled } from "./utils";

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				await addFeatureButton(
					"monoToStereoButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.label)
					:	window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.toggle[isMonoStereoEnabled() ? "on" : "off"]),
					getFeatureIcon("monoToStereoButton", placement),
					(checked) => {
						if (checked) enableMonoToStereo();
						else disableMonoToStereo();

						updateFeatureButtonTitle(
							"monoToStereoButton",
							window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.toggle[isMonoStereoEnabled() ? "on" : "off"])
						);
					},
					true,
					isMonoStereoEnabled(),
					fullscreenPlacement
				);
			},
			name: "monoToStereoButton",
			remove: async (placement) => {
				await removeFeatureButton("monoToStereoButton", placement);
				eventManager.removeEventListeners("monoToStereoButton");
			}
		}
	]
});
