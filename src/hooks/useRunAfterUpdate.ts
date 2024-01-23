import type { AnyFunction } from "@/src/types";

import { useLayoutEffect, useRef } from "react";

export const useRunAfterUpdate = () => {
	const handlersRef = useRef<AnyFunction[]>([]);

	useLayoutEffect(() => {
		handlersRef.current.forEach((handler) => handler());
		handlersRef.current = [];
	});

	return (handler: AnyFunction) => {
		handlersRef.current.push(handler);
	};
};
