import type { Nullable } from "@/src/types";

import { clamp } from "@/src/utils/math";
import { isShortsPage } from "@/src/utils/url";

/**
 * YouTube's own persisted player volume, read **once** - when the player constructs itself, long
 * after `base.js` has downloaded and parsed - and starting the video at whatever it finds there,
 * 100% when the key is empty.
 *
 * The extension's `playerContainer.setVolume()` never reaches that store: it goes through the player
 * API, which does not persist, so YouTube kept its own value and every load played loud until the
 * features' apply caught up. Writing the key from `document_start` - before the player bundle has
 * even been requested - puts the configured level where the player reads it, so the video starts at
 * that level instead of being corrected into it. The features' apply-and-verify loop stays as the
 * backstop for any load that still loses the race.
 *
 * The entry mirrors the player's own envelope - `{creation, data, expiration?}` wrapping the inner
 * `{"volume": n, "muted": b}` JSON - and is written to both stores because the player reads
 * sessionStorage first and localStorage second: a value written to only one of them can be shadowed
 * by a stale value in the other.
 */

/** YouTube's key, read once per player construction. */
const VOLUME_KEY = "yt-player-volume";
/** Extension-owned copy of what a seed replaced, so a disable can hand that value back. */
const BACKUP_KEY = "yte_persisted_volume_backup";
/** The player's own retention for its localStorage copy (2592E3 seconds). */
const STORAGE_TTL_MS = 2_592_000_000;
/** What the player boots at when the key holds nothing usable. */
const YOUTUBE_DEFAULT_VOLUME = 100;

type BackupEntry = {
	local: Nullable<string>;
	/** The volume this extension last wrote; anything else in the store was written by someone else. */
	seeded: number;
	session: Nullable<string>;
};
type StoreKind = "local" | "session";
type VolumeEnvelope = { creation?: number; data: string; expiration?: number };

type VolumePref = { muted: boolean; volume: number };

/**
 * The bucket a document should leave in YouTube's store for the player it is about to build.
 *
 * A document that is not a Shorts URL owns the watch bucket: an in-page navigation never runs
 * `document_start` again, so the document the user is already on is the only one that can put the
 * value in place before the next player constructs.
 */
export function documentVolumeBucket(buckets: {
	shortsPageVolume: number;
	watchPageVolume: number;
}): number {
	return isShortsPage() ? buckets.shortsPageVolume : buckets.watchPageVolume;
}

/**
 * The level YouTube would boot at with our seed removed, or `null` when this extension never seeded
 * one. Lets a feature capture the native level while its own level is still the one applied.
 */
export function peekPersistedVolume(): Nullable<number> {
	const backup = readBackup();
	if (backup === null) return null;
	return nativeVolume(backup, readStoredPref());
}

/**
 * Hands YouTube's own value back and drops the backup.
 * @returns the level YouTube will now boot at, or `null` when this extension never seeded one.
 */
export function restorePersistedVolume(): Nullable<number> {
	const backup = readBackup();
	if (backup === null) return null;

	const current = readStoredPref();
	// Only undo our own write: a value changed after the seed belongs to whoever changed it.
	if (current === null || current.volume === backup.seeded) restoreOriginals(backup);
	clearBackup();
	return nativeVolume(backup, current);
}

/**
 * Puts `volume` where the player reads it at construction. Safe to call repeatedly: only a seed
 * whose stored value has since been replaced by someone else re-captures the original, so a later
 * disable still hands back the value that was actually there.
 */
export function seedPersistedVolume(volume: number): void {
	if (!Number.isFinite(volume)) return;
	// The seed owns the level only; whatever mute state YouTube already had stays untouched.
	const target: VolumePref = {
		muted: readStoredPref()?.muted ?? false,
		volume: normalizeVolume(volume)
	};

	const backup = readBackup();
	const current = readStoredPref();
	const storedIsOurs = backup !== null && current !== null && current.volume === backup.seeded;
	const original =
		storedIsOurs && backup
			? { local: backup.local, session: backup.session }
			: { local: readRaw("local", VOLUME_KEY), session: readRaw("session", VOLUME_KEY) };

	writeSeedPref(target);
	writeBackup({ local: original.local, seeded: target.volume, session: original.session });
}

function clearBackup(): void {
	writeRaw("local", BACKUP_KEY, null);
}

function encodePref(pref: VolumePref, withTtl: boolean): string {
	const creation = Date.now();
	const envelope: VolumeEnvelope = {
		creation,
		data: JSON.stringify({ muted: pref.muted, volume: pref.volume })
	};
	if (withTtl) envelope.expiration = creation + STORAGE_TTL_MS;
	return JSON.stringify(envelope);
}

function getStore(kind: StoreKind): Nullable<Storage> {
	try {
		return kind === "local" ? window.localStorage : window.sessionStorage;
	} catch {
		// Storage access throws in sandboxed or storage-blocked contexts.
		return null;
	}
}

/** The level YouTube would boot at once our seed is out of the way. */
function nativeVolume(backup: BackupEntry, current: Nullable<VolumePref>): number {
	// Something other than our write is in the store now - YouTube's slider, a cleared store - and
	// that value is the one to hand back, not a stale original captured before it.
	if (current !== null && current.volume !== backup.seeded) return current.volume;
	return (
		parsePref(backup.local)?.volume ?? parsePref(backup.session)?.volume ?? YOUTUBE_DEFAULT_VOLUME
	);
}

/** Mirrors the player's own `PKa` normalisation: unusable becomes 100, otherwise a clamped whole %. */
function normalizeVolume(value: unknown): number {
	const volume = Number(value);
	return Number.isNaN(volume) ? YOUTUBE_DEFAULT_VOLUME : clamp(Math.floor(volume), 0, 100);
}

/** The player only reads the envelope's inner `data` payload; anything else it treats as absent. */
function parsePref(raw: Nullable<string>): Nullable<VolumePref> {
	if (!raw) return null;
	try {
		const envelope = JSON.parse(raw) as Partial<VolumeEnvelope>;
		if (typeof envelope.data !== "string") return null;
		const pref = JSON.parse(envelope.data) as Partial<VolumePref>;
		if (typeof pref.volume !== "number") return null;
		return { muted: !!pref.muted, volume: normalizeVolume(pref.volume) };
	} catch {
		return null;
	}
}

function readBackup(): Nullable<BackupEntry> {
	const raw = readRaw("local", BACKUP_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<BackupEntry>;
		if (typeof parsed.seeded !== "number") return null;
		return {
			local: parsed.local ?? null,
			seeded: parsed.seeded,
			session: parsed.session ?? null
		};
	} catch {
		return null;
	}
}

function readRaw(kind: StoreKind, key: string): Nullable<string> {
	const store = getStore(kind);
	if (!store) return null;
	try {
		return store.getItem(key);
	} catch {
		return null;
	}
}

/** Mirrors the player's read order (`g.Xw`): a session value shadows a local one, so both get written. */
function readStoredPref(): Nullable<VolumePref> {
	return parsePref(readRaw("session", VOLUME_KEY)) ?? parsePref(readRaw("local", VOLUME_KEY));
}

function restoreOriginals(backup: BackupEntry): void {
	writeRaw("local", VOLUME_KEY, backup.local);
	writeRaw("session", VOLUME_KEY, backup.session);
}

function writeBackup(entry: BackupEntry): void {
	writeRaw("local", BACKUP_KEY, JSON.stringify(entry));
}

function writeRaw(kind: StoreKind, key: string, value: Nullable<string>): void {
	const store = getStore(kind);
	if (!store) return;
	try {
		if (value === null) store.removeItem(key);
		else store.setItem(key, value);
	} catch {
		// A write we cannot make is a seed the features' apply-and-verify loop still has to fix.
	}
}

function writeSeedPref(pref: VolumePref): void {
	writeRaw("session", VOLUME_KEY, encodePref(pref, false));
	writeRaw("local", VOLUME_KEY, encodePref(pref, true));
}
