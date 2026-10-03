import type { audioTrack } from "youtube-player/dist/types";

import type { Nullable } from "@/src/types";

export type ParsedAudioTrack = PropertiesObj & {
	track: audioTrack;
};
export type PropertiesObj = {
	id: string;
	isAutoDubbed: boolean;
	isDefault: boolean;
	name: string;
};

/**
 * Finds the original (non-auto-dubbed) audio track from the available tracks.
 *
 * Priority order:
 * 1. Track marked as default AND not auto-dubbed (the video's native language)
 * 2. Any non-auto-dubbed track as fallback
 *
 * Before comparing, corrects unreliable isDefault flags via {@link correctDefaultFlags}.
 */
export function findDefaultTrack(tracks: Record<string, unknown>[]): Nullable<ParsedAudioTrack> {
	const parsed = tracks
		.map((t) => parseAudioTrack(t))
		.filter((t): t is ParsedAudioTrack => t !== null);
	// YouTube's Ro.isDefault is unreliable (inverted on some videos). Correct using
	// top-level boolean properties before we rely on isDefault.
	const corrected = correctDefaultFlags(tracks, parsed);

	let fallback: Nullable<ParsedAudioTrack> = null;
	for (const audio of corrected) {
		// Skip placeholder tracks that YouTube inserts
		if (audio.name === "Default" || audio.id === "und") {
			continue;
		}
		// Best case: the corrected default, not auto-dubbed - this is the original language
		if (audio.isDefault && !audio.isAutoDubbed) {
			return audio;
		}
		// Otherwise remember the first non-auto-dubbed track as a fallback
		if (fallback === null && !audio.isAutoDubbed) {
			fallback = audio;
		}
	}
	return fallback;
}

/**
 * Extracts the audio track descriptor from a raw YouTube track object.
 *
 * YouTube's track objects carry their descriptor (name, id, isDefault, isAutoDubbed) either
 * directly on the object or nested inside a property (e.g. Ro). We need the descriptor fields
 * for comparison, but setAudioTrack() requires the full track object - so we store both.
 *
 * Uses getOwnPropertyNames instead of Object.values because YouTube's compiled objects use
 * non-enumerable properties for the descriptor, which Object.values silently skips.
 */
export function parseAudioTrack(obj: Record<string, unknown>): Nullable<ParsedAudioTrack> {
	try {
		// Fast path: descriptor fields are directly on the object
		if (isAudioTrack(obj)) {
			return {
				id: obj.id,
				isAutoDubbed: obj.isAutoDubbed,
				isDefault: obj.isDefault,
				name: obj.name,
				track: obj as unknown as audioTrack
			};
		}
		// Slow path: search own property values (including non-enumerable) for the descriptor
		const descriptor = Object.getOwnPropertyNames(obj)
			.map((key) => {
				try {
					return obj[key];
				} catch {
					return undefined;
				}
			})
			.find(isAudioTrack);
		if (descriptor) {
			return {
				id: descriptor.id,
				isAutoDubbed: descriptor.isAutoDubbed,
				isDefault: descriptor.isDefault,
				name: descriptor.name,
				track: obj as unknown as audioTrack
			};
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * YouTube's nested descriptor (Ro.isDefault) is unreliable and inverted on some videos.
 * For example, a game trailer might mark Japanese as default when English original is the
 * actual default.
 *
 * This detects the real default flag by finding a top-level boolean property on each track
 * object that is true for exactly one track (the real default). If multiple candidates exist
 * (e.g. both D and J are true for one track each), it prefers the candidate whose track has
 * caption tracks - the original always has them, while audio-description tracks have none.
 */
function correctDefaultFlags(
	tracks: Record<string, unknown>[],
	parsed: ParsedAudioTrack[]
): ParsedAudioTrack[] {
	// Count how many tracks have each boolean property set to true
	const trueCounts = new Map<string, number>();
	for (const track of tracks) {
		for (const key of Object.getOwnPropertyNames(track)) {
			try {
				if (typeof track[key] === "boolean" && track[key] === true) {
					trueCounts.set(key, (trueCounts.get(key) ?? 0) + 1);
				}
			} catch {
				// skip inaccessible properties
			}
		}
	}
	// Only consider properties that are true for exactly one track - that's the real default
	const candidates = [...trueCounts.entries()]
		.filter(([_, count]) => count === 1)
		.map(([key]) => key);
	if (candidates.length === 0) return parsed;
	// If there's only one candidate, use it directly
	const [firstCandidate] = candidates;
	let defaultKey = firstCandidate;
	// Multiple candidates (e.g. D=true on original, J=true on descriptive) - prefer the one
	// whose track has caption tracks, since the original always has them
	if (candidates.length > 1) {
		for (const key of candidates) {
			const candidateTrack = tracks.find((t) => t[key] === true);
			if (candidateTrack) {
				const { captionTracks } = candidateTrack;
				if (Array.isArray(captionTracks) && captionTracks.length > 0) {
					defaultKey = key;
					break;
				}
			}
		}
	}
	// Override isDefault on every parsed track using the detected flag
	return parsed.map((audio, i) => ({ ...audio, isDefault: tracks[i][defaultKey] === true }));
}

/** Type guard: checks if a value has the audio track descriptor shape (name, id, isDefault, isAutoDubbed). */
function isAudioTrack(value: unknown): value is audioTrack & PropertiesObj {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		"name" in value &&
		"isDefault" in value &&
		"isAutoDubbed" in value &&
		"id" in value &&
		typeof value.name === "string" &&
		typeof value.isDefault === "boolean" &&
		typeof value.isAutoDubbed === "boolean" &&
		typeof value.id === "string"
	);
}
