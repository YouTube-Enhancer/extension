import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-sharp-corners",
			element: document.body
		});
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-sharp-corners",
			element: document.body
		});
	}
});
