import { deepMerge } from "@/src/utils/utilities";

import { defaultConfiguration } from "./utils/constants";

function setDefaultValues() {
	// Iterate over each option in the default configuration
	for (const option of Object.keys(defaultConfiguration)) {
		// Get the stored value from local storage
		const storedValueString = localStorage.getItem(option);
		// Destructure the default value for the current option
		const { [option]: defaultValue } = defaultConfiguration;
		// Check if the stored value is missing or an empty string
		if (storedValueString === null) {
			// Set the default value in localStorage after stringifying
			localStorage.setItem(option, typeof defaultValue === "string" ? defaultValue : JSON.stringify(defaultValue));
			// Set the default value in chrome storage
			void chrome.storage.local.set({ [option]: defaultValue });
			continue;
		}
		try {
			// Parse the stored value to check its type
			const storedValue =
				typeof defaultConfiguration[option] === "object" ||
				typeof defaultConfiguration[option] === "boolean" ||
				typeof defaultConfiguration[option] === "number"
					? JSON.parse(storedValueString)
					: storedValueString;
			// Check if the parsed value is an object and has properties
			if (typeof storedValue !== "object" || storedValue === null) continue;
			// Deep merge missing keys with their default values
			const updatedValue = deepMerge(defaultValue as Record<string, unknown>, storedValue as Record<string, unknown>);
			// Set the updated value in localStorage
			localStorage.setItem(option, JSON.stringify(updatedValue));
			// Set the updated value in chrome storage
			void chrome.storage.local.set({ [option]: updatedValue });
		} catch (error) {
			// Handle errors during JSON parsing
			console.error(`Error parsing stored value for option ${option}:`, error);
		}
	}
}
setDefaultValues();
