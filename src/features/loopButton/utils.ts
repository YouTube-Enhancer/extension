import { getFeatureMenuItem } from "../featureMenu/utils";

export async function loopButtonClickListener() {
	const videoElement = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;
	const loopMenuItem = getFeatureMenuItem("loopButton");
	if (!loopMenuItem) return;
	const loop = videoElement.hasAttribute("loop");
	if (loop) {
		videoElement.removeAttribute("loop");
	} else {
		videoElement.setAttribute("loop", "");
	}
}
export function makeLoopIcon() {
	const loopSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	loopSVG.setAttributeNS(null, "stroke-width", "0");
	loopSVG.setAttributeNS(null, "fill", "white");
	loopSVG.setAttributeNS(null, "height", "24");
	loopSVG.setAttributeNS(null, "width", "24");
	loopSVG.setAttributeNS(null, "viewBox", "0 0 24 24");
	const loopPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopPath.setAttributeNS(null, "d", "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z");
	loopSVG.appendChild(loopPath);
	return loopSVG;
}
