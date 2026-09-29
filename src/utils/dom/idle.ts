/**
 * Waits until the browser is idle, using requestIdleCallback when available.
 * Falls back to requestAnimationFrame + setTimeout on browsers without it.
 *
 * @param timeout - Maximum time to wait in ms before resolving anyway (default: 0 = no timeout)
 */
export function waitForIdle(timeout = 0): Promise<void> {
	return new Promise((resolve) => {
		if ("requestIdleCallback" in window) {
			window.requestIdleCallback(() => resolve(), { timeout });
		} else {
			requestAnimationFrame(() => setTimeout(resolve, timeout || 16));
		}
	});
}
