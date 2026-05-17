import { createFeature } from "@/src/features/_registry/createFeature";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		const style = document.getElementById("yte-hide-scroll-bar");
		if (style) style.remove();
	},
	onEnable: () => {
		if (document.getElementById("yte-hide-scroll-bar")) return;
		const style = document.createElement("style");
		style.textContent = `
		::-webkit-scrollbar {
			width: 0px;
			height: 0px;
		}
		html {
			scrollbar-width: none;
		}
	`;
		style.id = "yte-hide-scroll-bar";
		document.head.appendChild(style);
	}
});
