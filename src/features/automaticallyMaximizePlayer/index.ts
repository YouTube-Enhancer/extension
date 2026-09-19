import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { maximizePlayer, minimizePlayer } from "@/src/features/maximizePlayerButton/utils";

import { metadata } from "./index.metadata";

async function disableTheaterIfEnabled() {
	const theaterFeature = registry.getFeature("automaticTheaterMode");
	if (!theaterFeature) return;
	if (!registry.orchestrator.isFeatureEnabled("automaticTheaterMode")) return;
	const config = registry.configManager.getLast("automaticTheaterMode");
	await registry.lifecycleManager.disableFeature(theaterFeature, config);
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
		void registry.playerManager.executeWithRetries("automaticallyMaximizePlayer", [makeMaximizeTask()], ["maximize"], {
			maxAttempts: 15,
			overallTimeout: 20000,
			waitForLoaded: true
		});
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries("automaticallyMaximizePlayer", [makeMaximizeTask()], ["maximize"], {
			maxAttempts: 15,
			overallTimeout: 20000,
			waitForLoaded: true
		});
	}
});
