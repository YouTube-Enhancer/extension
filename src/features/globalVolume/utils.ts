import type { Nullable, YouTubePlayerDiv } from "@/src/types";
let originalVolume: Nullable<number> = null;

export async function restorePlayerVolume(playerContainer: YouTubePlayerDiv) {
	if (!playerContainer.setVolume || originalVolume === null) return;
	await playerContainer.setVolume(originalVolume);
	originalVolume = null;
}

export async function setPlayerVolume(playerContainer: YouTubePlayerDiv, userVolume: number) {
	if (!playerContainer.getVolume || !playerContainer.setVolume || !playerContainer.isMuted || !playerContainer.unMute) return;
	const [currentVolume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
	if (originalVolume === null) originalVolume = currentVolume;
	const clampedVolume = Math.max(0, Math.min(userVolume, 100));
	await playerContainer.setVolume(clampedVolume);
	if (isMuted && typeof playerContainer.unMute === "function") await playerContainer.unMute();
}
