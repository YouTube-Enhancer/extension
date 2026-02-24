import { modifyElementClassList } from "@/src/utils/utilities";
export function hideArtificialIntelligenceSummary() {
	modifyElementClassList("add", {
		className: "yte-hide-ai-summary",
		element: document.body
	});
}
export function showArtificialIntelligenceSummary() {
	modifyElementClassList("remove", {
		className: "yte-hide-ai-summary",
		element: document.body
	});
}
