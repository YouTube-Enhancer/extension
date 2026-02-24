import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { disableMonoToStereo, enableMonoToStereo, isMonoStereoEnabled } from "./utils";

export const addMonoToStereoButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { monoToStereoButton },
				enable_mono_to_stereo_button
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_mono_to_stereo_button) return;
	await addFeatureButton(
		"monoToStereoButton",
		monoToStereoButton,
		monoToStereoButton === "feature_menu" ?
			window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.label)
		:	window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.toggle[isMonoStereoEnabled() ? "on" : "off"]),
		getFeatureIcon("monoToStereoButton", monoToStereoButton),
		(checked) => {
			if (checked) enableMonoToStereo();
			else disableMonoToStereo();

			updateFeatureButtonTitle(
				"monoToStereoButton",
				window.i18nextInstance.t((t) => t.pages.content.features.monoToStereoButton.button.toggle[isMonoStereoEnabled() ? "on" : "off"])
			);
		},
		true,
		isMonoStereoEnabled()
	);
};

export const removeMonoToStereoButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("monoToStereoButton", placement);
	eventManager.removeEventListeners("monoToStereoButton");
};
