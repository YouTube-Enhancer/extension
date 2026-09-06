import type { Nullable } from "@/src/types";

const OWN_WRITE_WINDOW_MS = 1000;
/** How long after a key press, click or wheel turn a rate change is still taken to be the user's doing. */
const USER_INPUT_WINDOW_MS = 1500;
const RATE_EPSILON = 0.001;
const MAX_APPLIED_RATE_RECORDS = 8;

type AppliedRateRecord = { at: number; rate: number };

let appliedRates: AppliedRateRecord[] = [];
let overriddenVideoId: Nullable<string> = null;
let lastUserInputAt = 0;
let pointerHeld = false;
let userInputTracked = false;

export function clearManualOverride(): void {
	overriddenVideoId = null;
}

/**
 * Records real input events, so a rate change can be told apart from the ones YouTube makes on its own when a
 * video or an ad starts. Capture phase, so nothing that stops propagation hides an input.
 */
export function installUserInputTracking(): void {
	if (userInputTracked) return;
	userInputTracked = true;
	const note = (event: Event) => {
		if (event.isTrusted) lastUserInputAt = Date.now();
	};
	document.addEventListener(
		"pointerdown",
		(event) => {
			note(event);
			if (event.isTrusted) pointerHeld = true;
		},
		true
	);
	document.addEventListener(
		"pointerup",
		(event) => {
			note(event);
			pointerHeld = false;
		},
		true
	);
	document.addEventListener(
		"pointercancel",
		() => {
			pointerHeld = false;
		},
		true
	);
	document.addEventListener("keydown", note, true);
	document.addEventListener("wheel", note, { capture: true, passive: true });
}

export function isManualOverrideActive(urlVideoId: Nullable<string>): boolean {
	return overriddenVideoId !== null && overriddenVideoId === urlVideoId;
}

export function isOwnWrite(rate: number): boolean {
	pruneExpiredRecords(Date.now());
	return appliedRates.some((record) => Math.abs(record.rate - rate) <= RATE_EPSILON);
}

export function markExtensionAppliedRate(rate: number): void {
	const now = Date.now();
	appliedRates.push({ at: now, rate });
	pruneExpiredRecords(now);
	while (appliedRates.length > MAX_APPLIED_RATE_RECORDS) {
		appliedRates.shift();
	}
}

export function markManualOverride(urlVideoId: Nullable<string>): void {
	overriddenVideoId = urlVideoId;
}

/** Counts as input the user gave: for rate writes the extension's own controls make on the user's behalf. */
export function noteUserInput(): void {
	lastUserInputAt = Date.now();
}

/** Whether the user pressed, clicked or scrolled recently enough for a rate change to be theirs (a held pointer counts). */
export function wasUserInputRecent(): boolean {
	return pointerHeld || Date.now() - lastUserInputAt <= USER_INPUT_WINDOW_MS;
}

function pruneExpiredRecords(now: number): void {
	appliedRates = appliedRates.filter((record) => now - record.at <= OWN_WRITE_WINDOW_MS);
}
