import type { Nullable } from "@/src/types";

/**
 * Embedded-instance liveness protocol.
 *
 * Page-world slot (`window.__yteEmbeddedActiveId`) prevents stacked embedded
 * scripts on a long-lived tab. A ready marker on `document.documentElement`
 * is the cross-world signal the content script uses before forwarding storage.
 *
 * Prod vs dev takeover timing is caller config, not a DEV_MODE branch inside
 * this module.
 */

const READY_ATTR = "data-yte-embedded-ready";

export type SlotClaimOptions = {
	/** Called once when another instance holds the slot (dev dispose request). May be async. */
	onTakeover?: () => Promise<void> | void;
	/** Poll interval while waiting for another instance to release. Default 50ms. */
	pollMs?: number;
	/** Max wait for slot release before taking over anyway. */
	timeoutMs: number;
};

export function claimSlot(instanceId: string, options: SlotClaimOptions): Promise<boolean> {
	const { onTakeover, pollMs = 50, timeoutMs } = options;
	return (async () => {
		const existing = getActiveSlotId();
		if (!existing || existing === instanceId) {
			setActiveSlot(instanceId);
			return true;
		}
		await onTakeover?.();
		await waitForSlotRelease(timeoutMs, pollMs);
		setActiveSlot(instanceId);
		return isSlotHeldBy(instanceId);
	})();
}

export function clearReady(instanceId?: string): void {
	const current = document.documentElement.getAttribute(READY_ATTR);
	if (!current) return;
	if (instanceId === undefined || current === instanceId) {
		document.documentElement.removeAttribute(READY_ATTR);
	}
}

export function getActiveSlotId(): Nullable<string> {
	return window.__yteEmbeddedActiveId ?? null;
}

export function isReady(instanceId?: string): boolean {
	const ready = document.documentElement.getAttribute(READY_ATTR);
	if (!ready) return false;
	return instanceId === undefined || ready === instanceId;
}

export function isSlotFree(): boolean {
	return !window.__yteEmbeddedActiveId;
}

export function isSlotHeldBy(instanceId: string): boolean {
	return window.__yteEmbeddedActiveId === instanceId;
}

/** Publish readiness for content-script storage forwarding. */
export function markReady(instanceId: string): void {
	document.documentElement.setAttribute(READY_ATTR, instanceId);
}

export function releaseSlot(instanceId: string): void {
	if (window.__yteEmbeddedActiveId === instanceId) {
		window.__yteEmbeddedActiveId = undefined;
	}
	clearReady(instanceId);
}

/**
 * Poll until an embedded instance publishes readiness (DOM marker) or timeout.
 * Content scripts can read the attribute; they cannot read the page-world slot.
 */
export function waitForReady(timeoutMs: number, pollMs = 50): Promise<boolean> {
	return new Promise((resolve) => {
		const started = Date.now();
		const poll = (): void => {
			if (isReady()) {
				resolve(true);
				return;
			}
			if (Date.now() - started >= timeoutMs) {
				resolve(false);
				return;
			}
			setTimeout(poll, pollMs);
		};
		poll();
	});
}

/**
 * Poll until the slot is free or timeout elapses.
 * Used by takeover and by content/dev dispose waits.
 */
export function waitForSlotRelease(timeoutMs: number, pollMs = 50): Promise<void> {
	return new Promise((resolve) => {
		const started = Date.now();
		const poll = (): void => {
			const active = getActiveSlotId();
			if (!active || Date.now() - started >= timeoutMs) {
				resolve();
				return;
			}
			setTimeout(poll, pollMs);
		};
		poll();
	});
}

function setActiveSlot(instanceId: string): void {
	window.__yteEmbeddedActiveId = instanceId;
}
