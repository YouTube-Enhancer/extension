import { modifyElementClassList } from "@/src/utils/utilities";
export async function hideArtificialIntelligenceSummary() {
	modifyElementClassList("add", {
		className: "yte-hide-ai-summary",
		element: document.body
	});
}
export async function showArtificialIntelligenceSummary() {
	modifyElementClassList("remove", {
		className: "yte-hide-ai-summary",
		element: document.body
	});
}
