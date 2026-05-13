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
	let mainTrack: Nullable<audioTrack> = null;
	let propertiesObject: Nullable<PropertiesObj> = null;

	// Find the main track (has an "id" field that is a string)
	// and the properties track (has name/isDefault/isAutoDubbed)
	for (const value of Object.values(obj)) {
		// Skip if not an object
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			continue;
		}

		// Check if this could be the main track (has string "id" field AND passes audioTrack check)
		if ("id" in value && typeof value.id === "string" && isAudioTrack(value)) {
			mainTrack = value;
		}

		// Check if this is the properties track (has name, isDefault, isAutoDubbed with correct types)
		if (isAudioTrack(value)) {
			propertiesObject = {
				id: value.id,
				isAutoDubbed: value.isAutoDubbed,
				isDefault: value.isDefault,
				name: value.name
			};
		}
	}

	// If we found both tracks, combine them
	if (mainTrack && propertiesObject) {
		return {
			...propertiesObject,
			track: mainTrack
		};
	}

	// Fallback to original behavior if we can't separate them properly
	for (const value of Object.values(obj)) {
		if (!isAudioTrack(value)) continue;
		return {
			id: value.id,
			isAutoDubbed: value.isAutoDubbed,
			isDefault: value.isDefault,
			name: value.name,
			track: value
		};
	}
	return null;
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
