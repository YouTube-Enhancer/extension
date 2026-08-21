import type { Nullable } from "@/src/types";

const OWN_WRITE_WINDOW_MS = 1000;
const RATE_EPSILON = 0.001;
const MAX_APPLIED_RATE_RECORDS = 8;

type AppliedRateRecord = { at: number; rate: number };

let appliedRates: AppliedRateRecord[] = [];
let overriddenVideoId: Nullable<string> = null;

export function clearManualOverride(): void {
	overriddenVideoId = null;
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

function pruneExpiredRecords(now: number): void {
	appliedRates = appliedRates.filter((record) => now - record.at <= OWN_WRITE_WINDOW_MS);
}
