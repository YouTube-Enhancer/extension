import { maximizePlayer, minimizePlayer } from "@/src/features/maximizePlayerButton/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export function disableAutomaticallyMaximizePlayer() {
	minimizePlayer();
}
export async function enableAutomaticallyMaximizePlayer() {
	const {
		data: {
			options: { enable_automatically_maximize_player }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_maximize_player) return;
	maximizePlayer();
}
