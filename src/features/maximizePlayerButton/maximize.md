## CSS

```css
div.ytp-chapter-hover-container.yte-maximized-chapter-hover-container,
div.ytp-chrome-bottom.yte-maximized-chrome-bottom {
	width: calc(100vw - 26px) !important;
}
video.html5-main-video.yte-maximized-video {
	width: 100vw !important;
	height: 100vh !important;
	left: 0 !important;
	top: 0 !important;
	object-fit: contain !important;
	background: black !important;
}
div#movie_player.yte-maximized-video-container {
	position: fixed !important;
	top: 0 !important;
	left: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	z-index: 2020 !important;
}
div.ytp-tooltip {
	top: calc(100vh - 231px) !important;
}
div.ytp-storyboard-framepreview-timestamp.yte-maximized-storyboard-framepreview-timestamp {
	z-index: 2021 !important;
}
div.yte-maximized-storyboard-framepreview-img {
	width: 100vw !important;
	height: 100vw !important;
	/* TODO: background fix */
}
div.ytp-fine-scrubbing-draggable {
	/* TODO: calculate transform translateX */
}
```

## JS

```ts
export function updateProgressBarPositions() {
	const seekBar = document.querySelector<HTMLDivElement>("div.ytp-progress-bar");
	const scrubber = document.querySelector<HTMLDivElement>("div.ytp-scrubber-container");
	const hoverProgress = document.querySelector<HTMLDivElement>("div.ytp-hover-progress");
	if (!seekBar) return;
	if (!scrubber) return;
	if (!hoverProgress) return;
	const elapsedTime = parseInt(seekBar?.ariaValueNow ?? "0") ?? 0;
	const duration = parseInt(seekBar?.ariaValueMax ?? "0") ?? 0;
	const seekBarWidth = seekBar?.clientWidth ?? 0;

	const scrubberPosition = Math.ceil(parseFloat(Math.min((elapsedTime / duration) * seekBarWidth, seekBarWidth).toFixed(1)));
	scrubber.style.transform = `translateX(${scrubberPosition}px)`;
	hoverProgress.style.left = `${scrubberPosition}px`;
}
// Add listener for time update on video element
```

## Things that need to be adjusted when the video player is maximized

1. video element: video.html5-main-video
2. video container: div#movie_player
3. progress bar
4. progress bar scrubber
5. chrome bottom controls: div.ytp-chrome-bottom
6. chapter hover container: div.ytp-chapter-hover-container
7. pull scrubber preview element: div.ytp-storyboard-framepreview-img
8. story board timestamp: div.ytp-storyboard-framepreview-timestamp
9. tooltips div.ytp-tooltip
10. hover progress bar: div.ytp-hover-progress
11. play progress bar: div.ytp-play-progress
12. fine scrubbing draggable preview element: div.ytp-fine-scrubbing-draggable

## Things that have been implemented

- video element
- video container
- progress bar scrubber
- chrome bottom controls
- story board timestamp

## Things that need to be implemented

- progress bar
- chapter hover container
- pull scrubber preview element
- tooltips
- hover progress bar
- play progress bar
- fine scrubbing draggable preview element
