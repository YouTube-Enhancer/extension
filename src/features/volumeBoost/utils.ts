import { getAudioEngine } from "@/src/utils/audioEngine";
import { browserColorLog, formatError } from "@/src/utils/utilities";

export const MIN_DB = 0;
export const MAX_DB = Infinity;
export const STEP_DB = 1;

export function applyVolumeBoostDb(db: number): void {
	const engine = getAudioEngine();
	if (!engine) return;
	engine.volumeGain.gain.value = dbToLinear(clampDb(db));
}

export function clampDb(db: number) {
	return Math.min(MAX_DB, Math.max(MIN_DB, db));
}

export function dbToLinear(db: number) {
	return Math.pow(10, db / 20);
}
export function disableVolumeBoost() {
	const engine = getAudioEngine();
	if (!engine) return;
	engine.volumeGain.gain.value = 1;
}

export function setupVolumeBoost(): void {
	try {
		getAudioEngine();
		browserColorLog("Volume boost enabled", "FgMagenta");
	} catch (error) {
		browserColorLog(`Volume boost failed: ${formatError(error)}`, "FgRed");
	}
}
