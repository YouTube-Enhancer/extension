import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["home"] },
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-official-artist-videos-from-home-page",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-official-artist-videos-from-home-page",
			element: document.body
		});
	}
});
