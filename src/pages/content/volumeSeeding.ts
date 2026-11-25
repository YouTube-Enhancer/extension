import type { FeatureState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { initialState as rememberVolumeInitialState } from "@/src/features/rememberVolume/index.metadata";
import { storage } from "@/src/pages/content/windowMessageDispatcher";
import { parseStoredValue } from "@/src/utils/config/utils";
import {
	documentVolumeBucket,
	restorePersistedVolume,
	seedPersistedVolume
} from "@/src/utils/player/persistedVolume";

/**
 * Put the configured level into YouTube's own volume store before this document's player is built.
 *
 * The player reads `yt-player-volume` exactly once - when it constructs itself, long after `base.js`
 * has downloaded and parsed - and starts the video at whatever it finds there, defaulting to 100%
 * when the key is empty. The extension's own `setVolume()` never reaches that store, so without this
 * seed every load plays loud and the features' apply only lands after the first audible frames.
 *
 * Seeding deliberately ignores the features' page gates: an in-page navigation (home feed -> video)
 * never runs `document_start` again, so the document the user is already on is the only one that
 * can put the value in place before the next player boots.
 *
 * Reads its three keys directly instead of going through `getCachedSettings()`, which would warm the
 * cache the page bootstrap answers `request_data options` from - a change arriving before the
 * storage listener is attached would then be served stale.
 */
export const seedPersistedVolumeAtStart = async (): Promise<void> => {
	try {
		const stored = await storage.local.get([
			"globalVolume",
			"rememberVolume",
			"state:rememberVolume"
		]);
		const globalVolume = parseStoredValue(
			stored.globalVolume as string
		) as configuration["globalVolume"];
		const rememberVolume = parseStoredValue(
			stored.rememberVolume as string
		) as configuration["rememberVolume"];

		if (globalVolume?.enabled) {
			if (typeof globalVolume.volume === "number") seedPersistedVolume(globalVolume.volume);
			return;
		}
		if (rememberVolume?.enabled) {
			const remembered = (parseStoredValue(stored["state:rememberVolume"] as string) ??
				rememberVolumeInitialState) as FeatureState["state:rememberVolume"];
			// A remembered 0 means "nothing to force" here, exactly as rememberedVolumeForCurrentPage
			// reads it: hand back any seed an earlier value left behind rather than booting at it.
			const bucket = documentVolumeBucket(remembered);
			if (bucket) seedPersistedVolume(bucket);
			else restorePersistedVolume();
			return;
		}

		// Neither volume feature owns the store: hand YouTube's own value back, so a feature that was
		// disabled with no page open to run its onDisable does not keep forcing its level forever.
		restorePersistedVolume();
	} catch {
		// Losing this race only costs the loud first second the features' apply already fixes;
		// it must never delay or break page startup.
	}
};
