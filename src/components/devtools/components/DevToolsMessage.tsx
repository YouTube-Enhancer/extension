import type { ClassValue } from "clsx";

import { cn } from "@/src/utils/style";

type DevToolsMessageProps = {
	className?: ClassValue;
	message: string;
};

export function DevToolsEmpty({ className, message }: DevToolsMessageProps) {
	return (
		<div className={cn("flex h-64 items-center justify-center text-[#969696]", className)}>
			<p>{message}</p>
		</div>
	);
}

export function DevToolsError({ className, message }: DevToolsMessageProps) {
	return (
		<div className={cn("flex h-64 items-center justify-center text-[#ff6b6b]", className)}>
			<p>{message}</p>
		</div>
	);
}
