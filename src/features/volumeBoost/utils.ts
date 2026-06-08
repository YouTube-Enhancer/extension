import { getAudioEngine } from "@/src/utils/audioEngine";
import { formatError } from "@/src/utils/format/error";
import { browserColorLog } from "@/src/utils/logging";
import { clampDb, dbToLinear } from "@/src/utils/misc";

export function applyVolumeBoostDb(db: number): void {
	const engine = getAudioEngine();
	if (!engine) return;
	engine.volumeGain.gain.value = dbToLinear(clampDb(db));
}

export function setupVolumeBoost(): void {
	try {
		getAudioEngine();
		browserColorLog("Volume boost enabled", "FgMagenta");
	} catch (error) {
		browserColorLog(`Volume boost failed: ${formatError(error)}`, "FgRed");
	}
}
