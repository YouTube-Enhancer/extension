import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import type { ButtonPlacement } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { isMiniPlayerActive, setMiniPlayerManual, toggleMiniPlayerManual } from "@/src/features/miniPlayer";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";
let currentPlacement: ButtonPlacement | null = null;
function syncMiniPlayerButtonUI(active: boolean) {
	if (!currentPlacement) return;
	if (currentPlacement !== "feature_menu") {
		updateFeatureButtonTitle(
			"miniPlayerButton",
			window.i18nextInstance.t((translations) => translations.pages.content.features.miniPlayerButton.button.toggle[active ? "on" : "off"])
		);
		const btn = getFeatureButton("miniPlayerButton");
		if (btn instanceof HTMLButtonElement) {
			btn.ariaChecked = active.toString();
			const icon = getFeatureIcon("miniPlayerButton", "below_player");
			if (typeof icon === "object" && icon && "on" in icon && "off" in icon) {
				updateFeatureButtonIcon(btn, active ? icon.on : icon.off);
			}
		}
	}
}
export const addMiniPlayerButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { miniPlayerButton },
				enable_comments_mini_player_button
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_comments_mini_player_button) return;
	currentPlacement = miniPlayerButton;
	await addFeatureButton(
		"miniPlayerButton",
		miniPlayerButton,
		miniPlayerButton === "feature_menu" ?
			window.i18nextInstance.t((translations) => translations.pages.content.features.miniPlayerButton.button.label)
		:	window.i18nextInstance.t(
				(translations) => translations.pages.content.features.miniPlayerButton.button.toggle[isMiniPlayerActive() ? "on" : "off"]
			),
		getFeatureIcon("miniPlayerButton", miniPlayerButton),
		(checked) => {
			if (typeof checked === "boolean") void setMiniPlayerManual(checked);
			else void toggleMiniPlayerManual();
		},
		true,
		isMiniPlayerActive()
	);
	document.addEventListener("yte-mini-player-state", yteMiniPlayerStateHandler);
};
export const removeMiniPlayerButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("miniPlayerButton", placement);
	eventManager.removeEventListeners("miniPlayerButton");
	currentPlacement = null;
	document.removeEventListener("yte-mini-player-state", yteMiniPlayerStateHandler);
};
function yteMiniPlayerStateHandler(e: unknown) {
	const evt = e as CustomEvent<{ active: boolean }>;
	syncMiniPlayerButtonUI(Boolean(evt.detail?.active));
}
