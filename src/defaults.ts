import type { configuration } from "./types";

import { defaultConfiguration } from "./utils/constants";

Object.keys(defaultConfiguration).forEach((option) => {
	// If the option was not previously stored in localStorage
	if (localStorage[option] === undefined) {
		// then set it to the default value
		const { [option]: defaultValue } = defaultConfiguration;
		localStorage[option] = typeof defaultValue === "string" ? defaultValue : JSON.stringify(defaultValue);

		// and also set it in the Chrome Storage API.
		void chrome.storage.local.set({
			[option]: localStorage[option] as configuration[typeof option]
		});
	}
});
