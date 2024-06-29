import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export async function enableHidePaidPromotionBanner() {
	const {
		data: {
			options: { enable_hide_paid_promotion_banner }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_paid_promotion_banner) return;
	modifyElementClassList("add", {
		className: "yte-hide-paid-promotion-banner",
		element: document.querySelector(".ytp-paid-content-overlay")
	});
}

export function disableHidePaidPromotionBanner() {
	modifyElementClassList("remove", {
		className: "yte-hide-paid-promotion-banner",
		element: document.querySelector(".ytp-paid-content-overlay")
	});
}
