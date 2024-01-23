import { useLayoutEffect, useRef } from "react";

import type { AnyFunction } from "../types";

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
