import pkg from "../../../package.json";

chrome.runtime.onInstalled.addListener((details) => {
	const { previousVersion, reason } = details;
	console.log(previousVersion, reason);
	if (!previousVersion) return;
	switch (reason) {
		case chrome.runtime.OnInstalledReason.INSTALL: {
			// Open the options page after install
			void chrome.tabs.create({ url: "/src/pages/options/index.html" });
			break;
		}
		case chrome.runtime.OnInstalledReason.UPDATE: {
			const { version } = pkg;
			if (
				isNewMajorVersion(previousVersion as VersionString, version as VersionString) ||
				isNewMinorVersion(previousVersion as VersionString, version as VersionString)
			) {
				// Open options page if a new major or minor version is released
				void chrome.tabs.create({ url: "/src/pages/options/index.html" });
			}
			break;
		}
	}
});
type VersionString = `${string}.${string}.${string}`;

function isNewMinorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [, oldMinorVersion] = oldVersion.split(".");
	const [, newMinorVersion] = newVersion.split(".");
	return oldMinorVersion !== newMinorVersion;
}
function isNewMajorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [oldMajorVersion] = oldVersion.split(".");
	const [newMajorVersion] = newVersion.split(".");
	return oldMajorVersion !== newMajorVersion;
}
