import { createFeature } from "@/src/features/_registry/createFeature";
import { disableScrollWheelControl, enableScrollWheelControl, updateScrollWheelConfig } from "@/src/features/scrollWheelController";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: (config) => updateScrollWheelConfig("volume", config),
	onDisable: (config) => {
		updateScrollWheelConfig("volume", config);
		disableScrollWheelControl("volume");
	},
	onEnable: async (config) => {
		await enableScrollWheelControl("volume", config);
	},
	onNavigate: async (config) => {
		await enableScrollWheelControl("volume", config);
	}
});
