import { createFeature } from "@/src/features/_registry/createFeature";
import { disableScrollWheelControl, enableScrollWheelControl, refreshScrollWheelOptions } from "@/src/features/scrollWheelController";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: () => refreshScrollWheelOptions(),
	onDisable: () => disableScrollWheelControl("volume"),
	onEnable: async () => {
		await enableScrollWheelControl("volume");
	},
	onNavigate: async () => {
		await enableScrollWheelControl("volume");
	}
});
