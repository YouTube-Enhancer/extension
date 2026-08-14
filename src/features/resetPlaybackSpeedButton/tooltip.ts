import { getFeatureButton, getFeatureMenuItemLabel, updateFeatureButtonTitle } from "@/src/features/buttonController";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

export function getResetButtonTitle(targetSpeed: number) {
	try {
		return window.i18nextInstance.t((translations) => translations.pages.content.features.resetPlaybackSpeedButton.button.label, {
			SPEED: round(targetSpeed, 2)
		});
	} catch {
		return `Reset speed to ${round(targetSpeed, 2)}`;
	}
}

export async function getResetTargetSpeed(resetToPlayerSpeed?: boolean) {
	if (resetToPlayerSpeed === false) return 1;
	try {
		const {
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		const usePlayerSpeed = resetToPlayerSpeed ?? options.resetPlaybackSpeedButton?.resetToPlayerSpeed;
		if (!usePlayerSpeed) return 1;
		return options.playerSpeed?.speed ?? 1;
	} catch {
		return 1;
	}
}

export async function refreshResetButtonTooltip() {
	const button = getFeatureButton("resetPlaybackSpeedButton");
	if (!button) return;
	const {
		data: { options }
	} = await waitForSpecificMessage("options", "request_data", "content");
	const placement = options.resetPlaybackSpeedButton?.button?.placement ?? "player_controls_left";
	const resetToPlayerSpeed = options.resetPlaybackSpeedButton?.resetToPlayerSpeed ?? false;
	const playerSpeed = options.playerSpeed?.speed ?? 1;
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
