import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHideTranslateComment() {
	modifyElementClassList("remove", {
		className: "yte-hide-translate-comment",
		element: document.body
	});
}
export async function enableHideTranslateComment() {
	const {
		data: {
			options: {
				hideTranslateComment: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	modifyElementClassList("add", {
		className: "yte-hide-translate-comment",
		element: document.body
	});
}
