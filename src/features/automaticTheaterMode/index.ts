import { theaterModeButtonPathD } from "@/src/features/maximizePlayerButton/utils";
import { getLayoutType, isLivePage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

export function disableAutomaticTheaterMode() {
	if (!(isWatchPage() || isLivePage())) return;
	// Get the size button
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	// If the size button is not available return
	if (!sizeButton) return;
	const layoutType = getLayoutType();
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD[layoutType]}']`) !== null;
	if (inTheaterMode) {
		sizeButton.click();
	}
}
export async function enableAutomaticTheaterMode() {
	if (!(isWatchPage() || isLivePage())) return;
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_automatic_theater_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If automatic theater mode isn't enabled return
	if (!enable_automatic_theater_mode) return;
	// Get the size button
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	// If the size button is not available return
	if (!sizeButton) return;
	const layoutType = getLayoutType();
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD[layoutType]}']`) !== null;
	if (!inTheaterMode) {
		sizeButton.click();
	}
}
