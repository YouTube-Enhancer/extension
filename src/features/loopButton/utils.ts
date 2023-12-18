import { createSVGElement } from "@/src/utils/utilities";

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
export function makeLoopIcon() {
	const loopSVG = createSVGElement(
		"svg",
		{
			fill: "white",
			height: "24",
			"stroke-width": "0",
			viewBox: "0 0 24 24",
			width: "24"
		},
		createSVGElement("path", {
			d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4"
		})
	);
	return loopSVG;
}
