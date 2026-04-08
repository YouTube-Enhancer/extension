import { applyShortsVisibility } from "@/src/features/hideShorts/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHideShorts(): void {
	applyShortsVisibility({
		channel: false,
		home: false,
		search: false,
		sidebar: false,
		videos: false
	});
}
export async function enableHideShorts(): Promise<void> {
	const {
		data: {
			options: {
				hideShorts: {
					channel: { enabled: channel },
					home: { enabled: home },
					search: { enabled: search },
					sidebar: { enabled: sidebar },
					videos: { enabled: videos }
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	applyShortsVisibility({
		channel,
		home,
		search,
		sidebar,
		videos
	});
}
