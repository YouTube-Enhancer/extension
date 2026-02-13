import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { flipVideoVertical } from "@/src/features/flipVideoButtons/utils";
import { getFeatureIcon } from "@/src/icons";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { flipVideoHorizontal } from "./utils";

export const addFlipVideoVerticalButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { flipVideoVerticalButton },
				enable_flip_video_vertical_button
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_flip_video_vertical_button) return;
	await addFeatureButton(
		"flipVideoVerticalButton",
		flipVideoVerticalButton,
		window.i18nextInstance.t((translations) => translations.pages.content.features.flipVideoVerticalButton.button.label),
		getFeatureIcon("flipVideoVerticalButton", flipVideoVerticalButton),
		() => flipVideoVertical(),
		false
	);
};
export const removeFlipVideoVerticalButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("flipVideoVerticalButton", placement);
};

export const addFlipVideoHorizontalButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { flipVideoHorizontalButton },
				enable_flip_video_horizontal_button
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_flip_video_horizontal_button) return;
	await addFeatureButton(
		"flipVideoHorizontalButton",
		flipVideoHorizontalButton,
		window.i18nextInstance.t((translations) => translations.pages.content.features.flipVideoHorizontalButton.button.label),
		getFeatureIcon("flipVideoHorizontalButton", flipVideoHorizontalButton),
		() => flipVideoHorizontal(),
		false
	);
};
export const removeFlipVideoHorizontalButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("flipVideoHorizontalButton", placement);
};
