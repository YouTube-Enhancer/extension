import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: ({ videosPerRow }) => {
		document.documentElement.style.setProperty("--yte-videos-per-row-count", String(videosPerRow));
	},
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-videos-per-row",
			element: document.body
		});
		document.documentElement.style.removeProperty("--yte-videos-per-row-count");
	},
	onEnable: ({ videosPerRow }) => {
		modifyElementClassList("add", {
			className: "yte-videos-per-row",
			element: document.body
		});
		document.documentElement.style.setProperty("--yte-videos-per-row-count", String(videosPerRow));
	}
});
