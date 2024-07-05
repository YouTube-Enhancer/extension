import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { createTooltip, waitForSpecificMessage } from "@/src/utils/utilities";

export const addCopyTimestampUrlButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { copyTimestampUrlButton: copyTimestampUrlButtonPlacement },
				enable_copy_timestamp_url_button: enableCopyTimestampUrlButton
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableCopyTimestampUrlButton) return;
	function copyTimestampUrlButtonClickListener() {
		void (() => {
			const videoElement = document.querySelector<HTMLVideoElement>("video");
			const watchGrid = document.querySelector<HTMLElement>("ytd-watch-grid");
			if (!videoElement || !watchGrid) return;
			const videoId = watchGrid.getAttribute("video-id");
			const timestampUrl = `https://youtu.be/${videoId}?t=${videoElement.currentTime.toFixed()}`;
			void navigator.clipboard.writeText(timestampUrl);
			const button = getFeatureButton("copyTimestampUrlButton");
			if (!button) return;
			const { remove, update } = createTooltip({
				direction: copyTimestampUrlButtonPlacement === "below_player" ? "down" : "up",
				element: button,
				featureName: "copyTimestampUrlButton",
				id: "yte-feature-copyTimestampUrlButton-tooltip"
			});
			button.dataset.title = window.i18nextInstance.t("pages.content.features.copyTimestampUrlButton.button.copied");
			update();
			setTimeout(() => {
				remove();
				button.dataset.title = window.i18nextInstance.t("pages.content.features.copyTimestampUrlButton.button.label");
				update();
			}, 1000);
		})();
	}
	await addFeatureButton(
		"copyTimestampUrlButton",
		copyTimestampUrlButtonPlacement,
		window.i18nextInstance.t("pages.content.features.copyTimestampUrlButton.button.label"),
		getFeatureIcon("copyTimestampUrlButton", copyTimestampUrlButtonPlacement),
		copyTimestampUrlButtonClickListener,
		false
	);
};

export const removeCopyTimestampUrlButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("copyTimestampUrlButton", placement);
	eventManager.removeEventListeners("copyTimestampUrlButton");
};
