import { createFeature } from "@/src/features/_registry/createFeature";
import { type ElementClassPair, modifyElementsClassList } from "@/src/utils/dom/classList";
import { waitForAllElements } from "@/src/utils/dom/wait";

import "./index.css";
import { metadata } from "./index.metadata";

async function addFullscreenScrollClasses() {
	const elements = await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
	modifyElementsClassList("add", getFullscreenScrollPairs(elements));
}

function getFullscreenScrollPairs(elements?: Element[]): ElementClassPair[] {
	const [watchFlexy, app] = elements ?? [document.querySelector("ytd-watch-flexy"), document.querySelector("ytd-app")];
	return [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: watchFlexy
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: app
		}
	];
}

export default createFeature({
	...metadata,
	onDisable: async () => {
		const elements = await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
		modifyElementsClassList("remove", getFullscreenScrollPairs(elements));
	},
	onEnable: async () => {
		await addFullscreenScrollClasses();
	},
	onNavigate: async () => {
		await addFullscreenScrollClasses();
	}
});
