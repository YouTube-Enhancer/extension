import type { AnyFunction } from "@/src/types";

export function debounce(func: AnyFunction, delay: number) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}

export function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
