const THUMBNAIL_OVERLAY_SELECTORS = ["ytd-thumbnail-overlay-resume-playback-renderer", "ytw-thumbnail-overlay-resume-playback-renderer"] as const;

const THUMBNAIL_PROGRESS_BAR_SELECTORS = [
	".ytd-thumbnail-overlay-resume-playback-renderer #progress",
	".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
	".ytwThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress"
] as const;

export function getThumbnailOverlay(videoElement: Element): Element | null {
	for (const selector of THUMBNAIL_OVERLAY_SELECTORS) {
		const overlay = videoElement.querySelector(selector);
		if (overlay) {
			return overlay;
		}
	}
	return null;
}

export function getWatchedPercentage(videoElement: Element): number {
	for (const selector of THUMBNAIL_PROGRESS_BAR_SELECTORS) {
		const progressBar = videoElement.querySelector<HTMLElement>(selector);
		if (progressBar) {
			return parseFloat(progressBar.style.width) || 0;
		}
	}
	return 0;
}
