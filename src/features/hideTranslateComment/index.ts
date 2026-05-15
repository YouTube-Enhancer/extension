import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch"] },
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-translate-comment",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-translate-comment",
			element: document.body
		});
	}
});
