import type { ClassValue } from "clsx";

import Loader from "@/src/components/Loader";
import { cn } from "@/src/utils/style";

type DevToolsLoaderProps = {
	className?: ClassValue;
	message?: string;
};

export default function DevToolsLoader({ className, message = "Loading..." }: DevToolsLoaderProps) {
	return (
		<div className={cn("flex h-64 flex-col items-center justify-center gap-4 text-[#6b6b6b]", className)}>
			<Loader />
			<p>{message}</p>
		</div>
	);
}
