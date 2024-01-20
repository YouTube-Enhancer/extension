import type { ButtonPlacement, FeaturesThatHaveButtons } from "@/src/types";

import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { addOpenTranscriptButton, removeOpenTranscriptButton } from "@/src/features/openTranscriptButton/utils";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import { addVolumeBoostButton, removeVolumeBoostButton } from "@/src/features/volumeBoost";

export const featureButtonFunctions = {
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
} satisfies Record<
	FeaturesThatHaveButtons,
	{
		add: (() => Promise<void>) | (() => void);
		remove: ((placement: ButtonPlacement) => Promise<void>) | ((placement: ButtonPlacement) => void);
	}
>;
