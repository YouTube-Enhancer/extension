import type { AllButtonNames, ButtonPlacement } from "@/src/types";

import { addHideEndScreenCardsButton, removeHideEndScreenCardsButton } from "@/src/features/hideEndScreenCards";
import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { addOpenTranscriptButton, removeOpenTranscriptButton } from "@/src/features/openTranscriptButton/utils";
import {
	addDecreasePlaybackSpeedButton,
	addIncreasePlaybackSpeedButton,
	removeDecreasePlaybackSpeedButton,
	removeIncreasePlaybackSpeedButton
} from "@/src/features/playbackSpeedButtons";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import { addVolumeBoostButton, removeVolumeBoostButton } from "@/src/features/volumeBoost";

export type FeatureFuncRecord = {
	add: AddButtonFunction;
	remove: RemoveButtonFunction;
};

export const featureButtonFunctions = {
	decreasePlaybackSpeedButton: {
		add: addDecreasePlaybackSpeedButton,
		remove: removeDecreasePlaybackSpeedButton
	},
	hideEndScreenCardsButton: {
		add: addHideEndScreenCardsButton,
		remove: removeHideEndScreenCardsButton
	},
	increasePlaybackSpeedButton: {
		add: addIncreasePlaybackSpeedButton,
		remove: removeIncreasePlaybackSpeedButton
	},
	loopButton: {
		add: addLoopButton,
		remove: removeLoopButton
	},
	maximizePlayerButton: {
		add: addMaximizePlayerButton,
		remove: removeMaximizePlayerButton
	},
	openTranscriptButton: {
		add: addOpenTranscriptButton,
		remove: removeOpenTranscriptButton
	},
	screenshotButton: {
		add: addScreenshotButton,
		remove: removeScreenshotButton
	},
	volumeBoostButton: {
		add: addVolumeBoostButton,
		remove: removeVolumeBoostButton
	}
} satisfies Record<AllButtonNames, FeatureFuncRecord>;
export type AddButtonFunction = () => Promise<void>;
export type RemoveButtonFunction = (placement?: ButtonPlacement) => Promise<void>;
