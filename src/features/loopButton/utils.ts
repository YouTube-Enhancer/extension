import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";

export function loopButtonClickListener(checked?: boolean) {
	if (checked !== undefined) {
		updateFeatureButtonTitle("loopButton", window.i18nextInstance.t(`pages.content.features.loopButton.button.toggle.${checked ? "on" : "off"}`));
	}
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;
	const loop = videoElement.hasAttribute("loop");
	if (loop) {
		videoElement.removeAttribute("loop");
	} else {
		videoElement.setAttribute("loop", "");
	}
}
