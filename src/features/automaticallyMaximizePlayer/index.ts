import type { configuration } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { maximizePlayer, minimizePlayer } from "@/src/features/maximizePlayerButton/utils";

import { metadata } from "./index.metadata";

async function disableTheaterIfEnabled() {
	const theaterFeature = registry.getFeature("automaticTheaterMode");
	if (!theaterFeature) return;
	if (!registry.isFeatureEnabled("automaticTheaterMode")) return;
	await registry.updateFeatureEnabledState(
		"automaticTheaterMode",
		false,
		registry.getConfigOr(
			"automaticTheaterMode",
			theaterFeature.defaults as configuration["automaticTheaterMode"]
		)
	);
}

function makeMaximizeTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		await maximizePlayer(2000);
		return document.body.getAttribute("yte-maximized") === "";
	};
}

export default createFeature({
	...metadata,
	onDisable: () => minimizePlayer(),
	onEnable: async () => {
		await disableTheaterIfEnabled();
		void registry.playerRetry("automaticallyMaximizePlayer", [makeMaximizeTask()], ["maximize"], {
			maxAttempts: 60,
			overallTimeout: 45000,
			waitForLoaded: true
		});
	},
	onNavigate: () => {
		void registry.playerRetry("automaticallyMaximizePlayer", [makeMaximizeTask()], ["maximize"], {
			maxAttempts: 60,
			overallTimeout: 45000,
			waitForLoaded: true
		});
	}
});
