import { createFeature } from "@/src/features/_registry/createFeature";
import { cleanSearchPage, observeShareURLInput, removeObserver } from "@/src/features/shareShortener/utils";

import { metadata } from "./index.metadata";

const setupShareShortener = () => {
	cleanSearchPage(window.location.href);
	observeShareURLInput();
};

export default createFeature({
	...metadata,
	onDisable: removeObserver,
	onEnable: setupShareShortener,
	onNavigate: () => {
		removeObserver();
		setupShareShortener();
	}
});
