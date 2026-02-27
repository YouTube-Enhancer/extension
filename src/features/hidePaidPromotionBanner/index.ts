import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHidePaidPromotionBanner() {
	modifyElementClassList("remove", {
		className: "yte-hide-paid-promotion-banner",
		element: document.body
	});
}

export async function enableHidePaidPromotionBanner() {
	const {
		data: {
			options: {
				hidePaidPromotionBanner: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	modifyElementClassList("add", {
		className: "yte-hide-paid-promotion-banner",
		element: document.body
	});
}
