import { createFeature } from "@/src/features/_registry/createFeature";
import { type ElementClassPair, modifyElementsClassList } from "@/src/utils/dom/classList";
import { waitForAllElements } from "@/src/utils/dom/wait";

import "./index.css";
import { metadata } from "./index.metadata";

function addFullscreenScrollClasses() {
	void waitForAllElements(["ytd-watch-flexy", "ytd-app"]).then(() => {
		modifyElementsClassList("add", getFullscreenScrollPairs());
		return undefined;
	});
}

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
	onDisable: () => {
		void waitForAllElements(["ytd-watch-flexy", "ytd-app"]).then(() => {
			modifyElementsClassList("remove", getFullscreenScrollPairs());
			return undefined;
		});
	},
	onEnable: () => {
		addFullscreenScrollClasses();
	},
	onNavigate: () => {
		addFullscreenScrollClasses();
	}
});
