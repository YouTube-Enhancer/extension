import { getAudioEngine } from "@/src/utils/audioEngine";
import { formatError } from "@/src/utils/format/error";
import { browserColorLog } from "@/src/utils/logging";
import { clampDb, dbToLinear } from "@/src/utils/misc";

export function applyVolumeBoostDb(db: number): void {
	const engine = getAudioEngine();
	if (!engine) return;
	engine.volumeGain.gain.value = dbToLinear(clampDb(db));
}

/**
 * Ensures the audio engine exists. Logs once per enable so SPA navigation does not
 * spam the console on every onNavigate.
 */
export function setupVolumeBoost(options?: { quiet?: boolean }): void {
	try {
		getAudioEngine();
		if (!options?.quiet) browserColorLog("Volume boost enabled", "FgMagenta");
	} catch (error) {
		browserColorLog(`Volume boost failed: ${formatError(error)}`, "FgRed");
	}
}
