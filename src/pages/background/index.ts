chrome.runtime.onInstalled.addListener((details) => {
	if (["install", "update"].includes(details.reason)) {
		// Open the options page after install
		chrome.tabs.create({ url: "/src/pages/options/index.html" });
	}
});
