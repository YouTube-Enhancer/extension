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

export function findDefaultTrack(tracks: Record<string, unknown>[]): Nullable<ParsedAudioTrack> {
	let fallback: Nullable<ParsedAudioTrack> = null;
	for (const track of tracks) {
		const audio = parseAudioTrack(track);
		if (!audio) continue;
		// Skip tracks with name "Default" or id "und" as they are likely placeholders
		if (audio.name === "Default" || audio.id === "und") {
			continue;
		}
		if (!audio.isDefault && !audio.isAutoDubbed) {
			return audio;
		}
		if (fallback === null && audio.isDefault && !audio.isAutoDubbed) {
			fallback = audio;
		}
	}
	return fallback;
}

export function parseAudioTrack(obj: Record<string, unknown>): Nullable<ParsedAudioTrack> {
	// The player's track objects carry their descriptor (name, id, flags) in a nested value. The descriptor is what
	// comparisons use; the track object itself is what setAudioTrack accepts - handed the descriptor alone, the
	// player throws. A track that carries the descriptor fields directly is taken as it is.
	const descriptor = isAudioTrack(obj) ? obj : Object.values(obj).find(isAudioTrack);
	if (!descriptor) return null;
	return {
		id: descriptor.id,
		isAutoDubbed: descriptor.isAutoDubbed,
		isDefault: descriptor.isDefault,
		name: descriptor.name,
		track: obj as unknown as audioTrack
	};
}

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
