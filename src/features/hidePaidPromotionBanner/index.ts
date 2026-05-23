import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-paid-promotion-banner",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-paid-promotion-banner",
			element: document.body
		});
	}
});
