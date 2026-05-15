import { createFeature } from "@/src/features/_registry/createFeature";
import { type ElementClassPair, modifyElementsClassList } from "@/src/utils/dom/classList";
import { waitForAllElements } from "@/src/utils/dom/wait";

import "./index.css";
import { metadata } from "./index.metadata";

function getFullscreenScrollPairs(): ElementClassPair[] {
	return [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-watch-flexy")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		}
	];
}

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: async () => {
		await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
		modifyElementsClassList("remove", getFullscreenScrollPairs());
	},
	onEnable: async () => {
		await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
		modifyElementsClassList("add", getFullscreenScrollPairs());
	}
});
