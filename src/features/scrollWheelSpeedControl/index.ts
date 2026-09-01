import { createFeature } from "@/src/features/_registry/createFeature";
import { disableScrollWheelControl, enableScrollWheelControl, updateScrollWheelConfig } from "@/src/features/scrollWheelController";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: (config) => updateScrollWheelConfig("speed", config),
	onDisable: (config) => {
		updateScrollWheelConfig("speed", config);
		disableScrollWheelControl("speed");
	},
	onEnable: async (config) => {
		await enableScrollWheelControl("speed", config);
	},
	onNavigate: async (config) => {
		await enableScrollWheelControl("speed", config);
	}
});
