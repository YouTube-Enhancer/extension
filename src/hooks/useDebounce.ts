import { useCallback, useRef } from "react";

export default function useDebounceFn<T extends (...args: any[]) => void>(fn: T, delay: number): T {
	const timeout = useRef<NodeJS.Timeout | null>(null);
	return useCallback(
		(...args: Parameters<T>) => {
			if (timeout.current) clearTimeout(timeout.current);
			timeout.current = setTimeout(() => fn(...args), delay);
		},
		[fn, delay]
	) as T;
}
