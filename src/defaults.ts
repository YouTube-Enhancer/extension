import { defaultConfiguration } from "./utils/constants";

Object.keys(defaultConfiguration).forEach((option) => {
	if (localStorage[option] === undefined) {
		// Destructure `defaultConfiguration[option]` directly
		const { [option]: defaultValue } = defaultConfiguration;
		localStorage[option] = defaultValue;
	}
	chrome.storage.local.set({
		[option]: localStorage[option]
	});
});
