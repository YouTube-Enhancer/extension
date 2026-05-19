import { createFeature } from "@/src/features/_registry/createFeature";
import { cleanSearchPage, observeShareURLInput, removeObserver } from "@/src/features/shareShortener/utils";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "shorts", "live", "search"] },
	onDisable: removeObserver,
	onEnable: () => {
		cleanSearchPage(window.location.href);
		observeShareURLInput();
	}
});
