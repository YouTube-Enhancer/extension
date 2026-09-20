import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

let styleElement: HTMLStyleElement | null = null;

function applyFont(fontFamily: string) {
	if (!styleElement) {
		styleElement = document.createElement("style");
		styleElement.id = "yte-custom-font-family";
		document.head.appendChild(styleElement);
	}
	styleElement.textContent = `body { font-family: ${fontFamily} !important; }`;
}

function removeFont() {
	if (styleElement) {
		styleElement.remove();
		styleElement = null;
	}
}

export default createFeature({
	...metadata,
	onConfigChange: async ({ enabled }) => {
		if (!enabled) {
			removeFont();
			return;
		}
		const {
			data: {
				options: {
					customFontFamily: { fontFamily }
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		applyFont(fontFamily);
	},
	onDisable: () => {
		removeFont();
	},
	onEnable: async () => {
		const {
			data: {
				options: {
					customFontFamily: { fontFamily }
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		applyFont(fontFamily);
	}
});
