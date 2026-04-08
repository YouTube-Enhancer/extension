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
				buttonPlacement: { flipVideoVerticalButton },
				flipVideoButtons: {
					flipVertical: { enabled }
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
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
				buttonPlacement: { flipVideoHorizontalButton },
				flipVideoButtons: {
					flipHorizontal: { enabled }
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
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
