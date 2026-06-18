import { createFeature } from "@/src/features/_registry/createFeature";
import { maximizePlayer, minimizePlayer } from "@/src/features/maximizePlayerButton/utils";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => minimizePlayer(),
	onEnable: () => maximizePlayer(15000),
	onNavigate: async () => {
		await minimizePlayer();
		await maximizePlayer(15000);
	}
});
