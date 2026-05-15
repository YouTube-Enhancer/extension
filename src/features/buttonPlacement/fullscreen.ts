let fullscreenObserver: MutationObserver | null = null;
let fullscreenCallback: (() => void) | null = null;

export function isFullscreen(): boolean {
	return !!document.fullscreenElement || document.querySelector("ytd-app[fullscreen]") !== null;
}

export function startFullscreenObserver(callback: () => void) {
	fullscreenCallback = callback;
	const target = document.querySelector("ytd-app");
	if (target) {
		fullscreenObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "attributes" && mutation.attributeName === "fullscreen") {
					callback();
				}
			}
		});
		fullscreenObserver.observe(target, { attributeFilter: ["fullscreen"], attributes: true });
	}
	document.addEventListener("fullscreenchange", onFullscreenChange, { passive: true });
}

export function stopFullscreenObserver() {
	fullscreenObserver?.disconnect();
	fullscreenObserver = null;
	document.removeEventListener("fullscreenchange", onFullscreenChange);
	fullscreenCallback = null;
}

function onFullscreenChange() {
	fullscreenCallback?.();
}
