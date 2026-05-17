import type { JSX } from "react";

import { cn } from "@/src/utils/style";

import type { ViewMode } from "./types";

type ViewModeToggleProps = {
	errorCount: number;
	onViewModeChange: (mode: ViewMode) => void;
	viewMode: ViewMode;
};

export default function ViewModeToggle({ errorCount, onViewModeChange, viewMode }: ViewModeToggleProps): JSX.Element {
	const modes: { id: ViewMode; label: string }[] = [
		{ id: "summary", label: "Summary" },
		{ id: "slowest", label: "Slowest" },
		{ id: "by-phase", label: "By Phase" },
		{ id: "by-feature", label: "By Feature" },
		{ id: "charts", label: "Charts" },
		{ id: "errors", label: `Errors (${errorCount})` }
	];

	return (
		<div className="flex flex-wrap items-center gap-2">
			{modes.map((mode) => (
				<button
					className={cn(
						"rounded px-3 py-1.5 text-sm",
						viewMode === mode.id ? "bg-[#007acc] text-white" : "bg-[#2d2d2d] text-[#d4d4d4] hover:bg-[#3c3c3c]"
					)}
					key={mode.id}
					onClick={() => onViewModeChange(mode.id)}
				>
					{mode.label}
				</button>
			))}
		</div>
	);
}
