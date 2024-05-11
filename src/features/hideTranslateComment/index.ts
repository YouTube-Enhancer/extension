import type { Nullable } from "@/src/types";

import { observeTranslateComment, translateButtonSelector } from "@/src/features/hideTranslateComment/utils";
import { modifyElementClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
let translateCommentObserver: Nullable<MutationObserver> = null;
export async function enableHideTranslateComment() {
	const {
		data: {
			options: { enable_hide_translate_comment }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_translate_comment) return;
	await waitForAllElements(["ytd-item-section-renderer.ytd-comments div#header div#leading-section"]);
	const translateCommentButtons = document.querySelectorAll(translateButtonSelector);
	translateCommentButtons.forEach((button) => modifyElementClassList("add", { className: "yte-hide-translate-comment", element: button }));
	translateCommentObserver = observeTranslateComment();
}

export async function disableHideTranslateComment() {
	await waitForAllElements(["ytd-item-section-renderer.ytd-comments div#header div#leading-section"]);
	translateCommentObserver?.disconnect();
	translateCommentObserver = null;
	const translateCommentButtons = document.querySelectorAll(translateButtonSelector);
	translateCommentButtons.forEach((button) => modifyElementClassList("remove", { className: "yte-hide-translate-comment", element: button }));
}
