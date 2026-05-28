import type { ConfigurationNumericConstraints } from "@/src/validation/types";

import { youtubePlayerMaxSpeed, youtubePlayerMinSpeed, youtubePlayerSpeedStep } from "@/src/types";

export const numberConstraints: ConfigurationNumericConstraints = {
	globalVolume: { volume: { max: 100, min: 0 } },
	onScreenDisplay: { opacity: { max: 100, min: 1 } },
	playbackSpeedButtons: { speed: { max: 1.0, min: youtubePlayerSpeedStep, step: youtubePlayerSpeedStep } },
	playerSpeed: { speed: { max: youtubePlayerMaxSpeed, min: youtubePlayerMinSpeed, step: youtubePlayerSpeedStep } },
	scrollWheelSpeedControl: { steps: { max: 1.0, min: 0.05, step: 0.05 } },
	scrollWheelVolumeControl: { steps: { max: 100, min: 1 } }
};
