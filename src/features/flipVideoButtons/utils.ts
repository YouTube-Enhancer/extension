let flipX = false;
let flipY = false;

export function flipVideoHorizontal() {
	flipX = !flipX;
	applyVideoFlip();
}

export function flipVideoVertical() {
	flipY = !flipY;
	applyVideoFlip();
}

function applyVideoFlip() {
	const video = getVideo();
	if (!video) return;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;
	video.style.transform = `scale(${scaleX}, ${scaleY})`;
	video.style.transformOrigin = "center center";
}

function getVideo(): HTMLVideoElement | null {
	return document.querySelector("video");
}
