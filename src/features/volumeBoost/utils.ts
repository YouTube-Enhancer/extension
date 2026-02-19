import { browserColorLog, formatError } from "@/src/utils/utilities";

export const MIN_DB = 0;
export const MAX_DB = Infinity;
export const STEP_DB = 1;

export function applyVolumeBoostDb(db: number): void {
	if (!window.gainNode) setupVolumeBoost();
	if (!window.gainNode) return;
	const clamped = clampDb(db);
	window.gainNode.gain.value = dbToLinear(clamped);
}

export function clampDb(db: number) {
	return Math.min(MAX_DB, Math.max(MIN_DB, db));
}

export function dbToLinear(db: number) {
	return Math.pow(10, db / 20);
}
export function disableVolumeBoost() {
	if (!window.gainNode) return;
	window.gainNode.gain.value = 1;
}

export function setupVolumeBoost() {
	if (window.audioCtx && window.gainNode) return;
	try {
		const player = document.querySelector<HTMLMediaElement>("video");
		if (!player) return;
		window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		const source = window.audioCtx.createMediaElementSource(player);
		const gainNode = window.audioCtx.createGain();
		source.connect(gainNode);
		gainNode.connect(window.audioCtx.destination);
		window.gainNode = gainNode;
		browserColorLog("Volume boost enabled", "FgMagenta");
	} catch (error) {
		browserColorLog(`Volume boost failed: ${formatError(error)}`, "FgRed");
	}
}
