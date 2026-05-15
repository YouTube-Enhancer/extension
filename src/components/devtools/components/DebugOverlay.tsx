import type { JSX } from "react";

import { useState } from "react";

import { cn } from "@/src/utils/style";

type DebugOverlayProps = {
	isActive: boolean;
	onToggle: () => void;
};

export default function DebugOverlay({ isActive, onToggle }: DebugOverlayProps): JSX.Element {
	const [showTiming, setShowTiming] = useState(false);
	const [showFeatureCount, setShowFeatureCount] = useState(true);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-[#d4d4d4]">Debug Overlay</h3>
				<button
					className={cn("rounded px-3 py-1.5 text-sm font-medium", isActive ? "bg-[#4ec9b0] text-[#1e1e1e]" : "bg-[#2d2d2d] text-[#d4d4d4]")}
					onClick={onToggle}
				>
					{isActive ? "Active" : "Inactive"}
				</button>
			</div>

			<div className="space-y-2">
				<label className="flex items-center gap-2 text-sm text-[#d4d4d4]">
					<input checked={showTiming} className="size-4 accent-[#007acc]" onChange={(e) => setShowTiming(e.target.checked)} type="checkbox" />
					Show execution timing indicators
				</label>
				<label className="flex items-center gap-2 text-sm text-[#d4d4d4]">
					<input
						checked={showFeatureCount}
						className="size-4 accent-[#007acc]"
						onChange={(e) => setShowFeatureCount(e.target.checked)}
						type="checkbox"
					/>
					Show active feature count
				</label>
			</div>

			<div className="rounded border border-[#3c3c3c] bg-[#2d2d2d] p-4">
				<p className="mb-2 text-sm text-[#6b6b6b]">Preview</p>
				<div className="relative h-32 w-full rounded bg-[#1e1e1e]">
					{showFeatureCount && (
						<div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-[#007acc] px-2 py-1 text-xs text-white">
							<span>Features:</span>
							<span className="font-bold">5</span>
						</div>
					)}
					{showTiming && <div className="absolute bottom-2 left-2 rounded bg-[#4ec9b0] px-2 py-1 text-xs text-[#1e1e1e]">+12ms</div>}
				</div>
			</div>

			<p className="text-xs text-[#6b6b6b]">
				The debug overlay will inject visual indicators into the YouTube page showing active features and execution timings.
			</p>
		</div>
	);
}
