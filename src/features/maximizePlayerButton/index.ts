import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";
import "./index.css";
import { makeMaximizeSVG, maximizePlayer, minimizePlayer } from "./utils";

export async function addMaximizePlayerButton(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_maximize_player_button: enableMaximizePlayerButton } = options;
	// If the maximize player button option is disabled, return
	if (!enableMaximizePlayerButton) return;
	const maximizeSVG = makeMaximizeSVG();
	await addFeatureItemToMenu({
		featureName: "maximizePlayerButton",
		icon: maximizeSVG,
		isToggle: true,
		label: window.i18nextInstance.t("pages.content.features.maximizePlayerButton.label"),
		listener: (checked) => {
			if (checked === undefined) return;
			console.log(checked);
			if (checked) {
				maximizePlayer();
			} else {
				minimizePlayer();
			}
		}
	});
}
export function removeMaximizePlayerButton() {
	removeFeatureItemFromMenu("maximizePlayerButton");
	minimizePlayer();
	eventManager.removeEventListeners("maximizePlayerButton");
}
