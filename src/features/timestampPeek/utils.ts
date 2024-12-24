import eventManager from "@/src/utils/EventManager";

export function getTimestampLinkHref() {
	const {
		location: { pathname, search }
	} = window;
	return `${pathname}${search}`;
}
export function getTimestampFromString(str: string) {
	const timestampParam = new URLSearchParams(str).get("t") ?? "0";
	return parseInt(timestampParam, 10);
}
function getTimestampTexts() {
	const timestampLinkHref = getTimestampLinkHref();
	return Array.from(document.querySelectorAll<HTMLElement>(`.yt-core-attributed-string__link[href^='${timestampLinkHref}'`));
}
export function getTimestamps(): [HTMLElement, number][] {
	return getTimestampTexts()
		.map((timestampText) => [timestampText, getTimestampFromString(new URLSearchParams(timestampText.getAttribute("href") ?? "0").get("t") ?? "0")])
		.filter(([, timestamp]) => timestamp !== 0) as [HTMLElement, number][];
}
async function previewTimestamp(element: HTMLElement, timestamp: number) {
	const playerContainer = document.querySelector<HTMLDivElement>("#movie_player");
	if (!playerContainer) return;
	playerContainer.style.position = "absolute";
	playerContainer.style.top = `${element.getBoundingClientRect().top + window.scrollY}px`;
	playerContainer.style.width = "200px";
	playerContainer.style.maxWidth = "unset";
	playerContainer.style.transform = "translateX(-50%)";
	playerContainer.style.left = "50%";
	const player = playerContainer.querySelector(".video-stream.html5-main-video") as HTMLVideoElement;
	player.currentTime = timestamp;
	await player.play();
}
export function handleTimestampHover(element: HTMLElement, timestamp: number) {
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const { currentTime } = videoElement;
	const isPlaying = !videoElement.paused;
	eventManager.addEventListener(
		element,
		"mouseenter",
		() => {
			void (async () => {
				await previewTimestamp(element, timestamp);
			})();
		},
		"timestampPeek"
	);
	eventManager.addEventListener(
		element,
		"mouseleave",
		() => {
			void (async () => {
				videoElement.currentTime = currentTime;
				if (isPlaying) await videoElement.play();
			})();
		},
		"timestampPeek"
	);
}
