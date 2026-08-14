import { getFeatureButton, getFeatureMenuItemLabel, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

export function getResetButtonTitle(targetSpeed: number) {
	return window.i18nextInstance.t((translations) => translations.pages.content.features.resetPlaybackSpeedButton.button.label, {
		SPEED: round(targetSpeed, 2)
	});
}

export async function getResetTargetSpeed() {
	const {
		data: {
			options: {
				playerSpeed: { speed: playerSpeed },
				resetPlaybackSpeedButton: { resetToPlayerSpeed }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	return resetToPlayerSpeed ? playerSpeed : 1;
}

export async function refreshResetButtonTooltip() {
	const button = getFeatureButton("resetPlaybackSpeedButton");
	if (!button) return;
	const {
		data: {
			options: {
				playerSpeed: { speed: playerSpeed },
				resetPlaybackSpeedButton: {
					button: { placement },
					resetToPlayerSpeed
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const title = getResetButtonTitle(resetToPlayerSpeed ? playerSpeed : 1);
	button.dataset.title = title;
	updateFeatureButtonTitle("resetPlaybackSpeedButton", title);
	const menuLabel = getFeatureMenuItemLabel("resetPlaybackSpeedButton");
	if (menuLabel) menuLabel.textContent = title;
	const { update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName: "resetPlaybackSpeedButton",
		id: "yte-feature-resetPlaybackSpeedButton-tooltip"
	});
	update();
}
