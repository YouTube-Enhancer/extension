import { useCallback, useRef } from "react";

import type { Nullable } from "@/src/types";

export default function useDebounceFn<T extends (...args: any[]) => void>(fn: T, delay: number): T {
	const timeout = useRef<Nullable<ReturnType<typeof setTimeout>>>(null);
	return useCallback(
		(...args: Parameters<T>) => {
			if (timeout.current) clearTimeout(timeout.current);
			timeout.current = setTimeout(() => fn(...args), delay);
		},
		[fn, delay]
	) as T;
}
