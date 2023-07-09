chrome.runtime.onInstalled.addListener((details) => {
	if (["update", "install"].includes(details.reason)) {
		// Open the options page after install
		chrome.tabs.create({ url: "/src/pages/options/index.html" });
	}
});
