import type { FeaturesThatHaveButtons } from "../types";

import { addLoopButton, removeLoopButton } from "./loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "./maximizePlayerButton";
import { addOpenTranscriptButton, removeOpenTranscriptButton } from "./openTranscriptButton/utils";
import { addScreenshotButton, removeScreenshotButton } from "./screenshotButton";
import { addVolumeBoostButton, removeVolumeBoostButton } from "./volumeBoost";

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
		remove: (() => Promise<void>) | (() => void);
	}
>;
