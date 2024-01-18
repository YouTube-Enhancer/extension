export function loopButtonClickListener() {
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;
	const loop = videoElement.hasAttribute("loop");
	if (loop) {
		videoElement.removeAttribute("loop");
	} else {
		videoElement.setAttribute("loop", "");
	}
}
