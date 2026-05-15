import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { isMiniPlayerActive, setMiniPlayerManual, toggleMiniPlayerManual } from "@/src/features/miniPlayer";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement } from "@/src/types";

import { metadata } from "./index.metadata";

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
	} else {
		const btn = getFeatureButton("miniPlayerButton");
		if (btn) btn.ariaChecked = active.toString();
	}
}
function yteMiniPlayerStateHandler(e: unknown) {
	const evt = e as CustomEvent<{ active: boolean }>;
	syncMiniPlayerButtonUI(Boolean(evt.detail?.active));
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				currentPlacement = placement;
				const miniPlayerActive = isMiniPlayerActive();
				await addFeatureButton(
					"miniPlayerButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((translations) => translations.pages.content.features.miniPlayerButton.button.label)
					:	window.i18nextInstance.t(
							(translations) => translations.pages.content.features.miniPlayerButton.button.toggle[miniPlayerActive ? "on" : "off"]
						),
					getFeatureIcon("miniPlayerButton", placement),
					(checked) => {
						if (typeof checked === "boolean") void setMiniPlayerManual(checked);
						else void toggleMiniPlayerManual();
					},
					true,
					miniPlayerActive,
					fullscreenPlacement
				);
				document.addEventListener("yte-mini-player-state", yteMiniPlayerStateHandler);
			},
			name: "miniPlayerButton",
			remove: async (placement) => {
				await removeFeatureButton("miniPlayerButton", placement);
				eventManager.removeEventListeners("miniPlayerButton");
				currentPlacement = null;
				document.removeEventListener("yte-mini-player-state", yteMiniPlayerStateHandler);
			}
		}
	],
	dependencies: { includePages: ["watch", "live"] }
});
