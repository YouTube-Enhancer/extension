import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-endscreen-recommended-videos",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-endscreen-recommended-videos",
			element: document.body
		});
	}
});
