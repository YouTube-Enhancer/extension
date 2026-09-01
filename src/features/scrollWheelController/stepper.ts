import type { Nullable } from "@/src/types";

import { clamp } from "@/src/utils/math";

const APPLY_INTERVAL_MS = 80;
const DELTA_PER_STEP = 100;
const GESTURE_GAP_MS = 250;
const MAX_STEPS_PER_APPLY = 3;

export type WheelStepper = {
	cancel: () => void;
	feed: (event: WheelEvent) => void;
};

/**
 * Turns raw wheel events into discrete steps.
 *
 * - Deltas are normalized across devices so one mouse notch equals one step
 *   and trackpads accumulate proportionally instead of stepping per event.
 * - Applies are rate limited, but deferred input is flushed by a trailing
 *   timer instead of being dropped.
 * - The accumulator resets on direction changes and after an idle gap, so
 *   residue from a previous gesture can never fire steps in the wrong
 *   direction.
 *
 * @param onSteps - Receives the step count to apply; positive means the wheel scrolled down.
 * @returns The stepper; `feed` it wheel events, `cancel` it on teardown.
 */
export function createWheelStepper(onSteps: (steps: number) => void): WheelStepper {
	let accumulated = 0;
	let flushTimer: Nullable<ReturnType<typeof setTimeout>> = null;
	let lastApplyTime = 0;
	let lastEventTime = 0;

	const clearFlushTimer = () => {
		if (flushTimer === null) return;
		clearTimeout(flushTimer);
		flushTimer = null;
	};
	const scheduleFlush = (delay: number) => {
		if (flushTimer !== null) return;
		flushTimer = setTimeout(() => {
			flushTimer = null;
			apply(Date.now());
		}, delay);
	};
	const apply = (now: number) => {
		const steps = clamp(Math.trunc(accumulated / DELTA_PER_STEP), -MAX_STEPS_PER_APPLY, MAX_STEPS_PER_APPLY);
		if (steps === 0) return;
		accumulated -= steps * DELTA_PER_STEP;
		lastApplyTime = now;
		if (Math.abs(accumulated) >= DELTA_PER_STEP) scheduleFlush(APPLY_INTERVAL_MS);
		onSteps(steps);
	};

	return {
		cancel: clearFlushTimer,
		feed: (event: WheelEvent) => {
			const delta = normalizeWheelDelta(event);
			if (delta === 0) return;
			const now = Date.now();
			const changesDirection = accumulated !== 0 && Math.sign(delta) !== Math.sign(accumulated);
			if (changesDirection || now - lastEventTime > GESTURE_GAP_MS) {
				accumulated = 0;
				clearFlushTimer();
			}
			lastEventTime = now;
			accumulated += delta;
			const sinceLastApply = now - lastApplyTime;
			if (sinceLastApply >= APPLY_INTERVAL_MS) {
				clearFlushTimer();
				apply(now);
			} else if (Math.abs(accumulated) >= DELTA_PER_STEP) {
				scheduleFlush(APPLY_INTERVAL_MS - sinceLastApply);
			}
		}
	};
}

function normalizeWheelDelta(event: WheelEvent): number {
	switch (event.deltaMode) {
		// Firefox reports lines (3 per notch) rather than pixels.
		case WheelEvent.DOM_DELTA_LINE:
			return event.deltaY * (DELTA_PER_STEP / 3);
		case WheelEvent.DOM_DELTA_PAGE:
			return event.deltaY * DELTA_PER_STEP;
		default:
			return event.deltaY;
	}
}
