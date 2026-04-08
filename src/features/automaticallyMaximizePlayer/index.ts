import { maximizePlayer, minimizePlayer } from "@/src/features/maximizePlayerButton/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export function disableAutomaticallyMaximizePlayer() {
	minimizePlayer();
}
export async function enableAutomaticallyMaximizePlayer() {
	const {
		data: {
			options: {
				automaticallyMaximizePlayer: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	maximizePlayer();
}
