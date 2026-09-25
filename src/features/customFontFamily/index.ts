import { createFeature } from "@/src/features/_registry/createFeature";

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
	onConfigChange: ({ enabled, fontFamily }) => {
		if (!enabled) {
			removeFont();
			return;
		}
		applyFont(fontFamily);
	},
	onDisable: () => {
		removeFont();
	},
	onEnable: ({ fontFamily }) => {
		applyFont(fontFamily);
	}
});
