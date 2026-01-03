import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export async function disableHideTranslateComment() {
	modifyElementClassList("remove", {
		className: "yte-hide-translate-comment",
		element: document.body
	});
}
export async function enableHideTranslateComment() {
	const {
		data: {
			options: { enable_hide_translate_comment }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_translate_comment) return;
	modifyElementClassList("add", {
		className: "yte-hide-translate-comment",
		element: document.body
	});
}
