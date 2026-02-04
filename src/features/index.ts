import type { AllButtonNames, ButtonPlacement } from "@/src/types";

import { addCopyTimestampUrlButton, removeCopyTimestampUrlButton } from "@/src/features/copyTimestampUrlButton";
import { addForwardButton, addRewindButton, removeForwardButton, removeRewindButton } from "@/src/features/forwardRewindButtons";
import { addHideEndScreenCardsButton, removeHideEndScreenCardsButton } from "@/src/features/hideEndScreenCards";
import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { addMiniPlayerButton, removeMiniPlayerButton } from "@/src/features/miniPlayerButton";
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
	copyTimestampUrlButton: {
		add: addCopyTimestampUrlButton,
		remove: removeCopyTimestampUrlButton
	},
	decreasePlaybackSpeedButton: {
		add: addDecreasePlaybackSpeedButton,
		remove: removeDecreasePlaybackSpeedButton
	},
	forwardButton: {
		add: addForwardButton,
		remove: removeForwardButton
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
	miniPlayerButton: {
		add: addMiniPlayerButton,
		remove: removeMiniPlayerButton
	},
	openTranscriptButton: {
		add: addOpenTranscriptButton,
		remove: removeOpenTranscriptButton
	},
	rewindButton: {
		add: addRewindButton,
		remove: removeRewindButton
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
