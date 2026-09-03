import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { applyChatFrameHide, removeChatFrameHide } from "@/src/features/hideArtificialIntelligence/utils";
import { modifyElementClassList } from "@/src/utils/dom/classList";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		modifyElementClassList("remove", {
			className: "yte-hide-ai",
			element: document.body
		});
		removeChatFrameHide();
	},
	onEnable: () => {
		modifyElementClassList("add", {
			className: "yte-hide-ai",
			element: document.body
		});
		applyChatFrameHide();
	}
});
