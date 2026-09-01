import { createFeature } from "@/src/features/_registry/createFeature";
import { disableScrollWheelControl, enableScrollWheelControl, refreshScrollWheelOptions } from "@/src/features/scrollWheelController";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: () => refreshScrollWheelOptions(),
	onDisable: () => disableScrollWheelControl("speed"),
	onEnable: async () => {
		await enableScrollWheelControl("speed");
	},
	onNavigate: async () => {
		await enableScrollWheelControl("speed");
	}
});
