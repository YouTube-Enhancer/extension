import type { AnyFunction, Nullable } from "@/src/types";

/**
 * Coalesces a burst of triggers into one trailing run: `schedule()` starts `delayMs` on the first
 * call and ignores calls while a run is pending, so a steady stream of triggers cannot postpone the
 * run forever (a throttle rather than a debounce). `cancel()` drops the pending run without it
 * executing.
 */
export function createTrailingThrottle(fn: () => void, delayMs: number) {
	let handle: Nullable<ReturnType<typeof setTimeout>> = null;
	return {
		cancel() {
			if (handle === null) return;
			clearTimeout(handle);
			handle = null;
		},
		schedule() {
			if (handle !== null) return;
			handle = setTimeout(() => {
				handle = null;
				fn();
			}, delayMs);
		}
	};
}

export function debounce(func: AnyFunction, delay: number) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
