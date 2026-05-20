import type { JSX } from "react";

import type { FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";

import { cn } from "@/src/utils/style";

import type { FeatureInfo } from "./types";

type FeatureCardProps = {
	feature: FeatureInfo;
	isExpanded: boolean;
	isTogglePending: boolean;
	onConfigClick: (featureId: FeatureKeys) => void;
	onStateClick: (featureId: FeatureKeysWithState) => void;
	onSubToggle: (path: string, currentEnabled: boolean) => Promise<void>;
	onToggle: (path: string, currentEnabled: boolean) => Promise<void>;
	onToggleExpand: () => void;
};

export default function FeatureCard({
	feature,
	isExpanded,
	isTogglePending,
	onConfigClick,
	onStateClick,
	onSubToggle,
	onToggle,
	onToggleExpand
}: FeatureCardProps): JSX.Element {
	const enabledCount = feature.subFeatures?.filter((s) => s.enabled).length ?? 0;
	const totalCount = feature.subFeatures?.length ?? 0;

	return (
		<div
			className={cn(
				"cursor-pointer rounded border p-3 transition-colors",
				feature.enabled ? "border-[#4ec9b0] bg-[#1e3a2f]" : "border-[#6a6a6a] bg-[#2d2d2d]"
			)}
			onClick={() => feature.hasNestedEnabled && onToggleExpand()}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{feature.hasNestedEnabled && <span className="text-sm text-[#d4d4d4]">{isExpanded ? "▼" : "▶"}</span>}
					<p className="font-medium text-[#d4d4d4]">
						{feature.id}
						{feature.hasNestedEnabled && ` (${enabledCount}/${totalCount})`}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{feature.hasState && (
						<button
							className="rounded bg-[#3c3c3c] px-2 py-0.5 text-xs text-[#9cdcfe] hover:bg-[#4c4c4c]"
							onClick={(e) => {
								e.stopPropagation();
								onStateClick(feature.id as FeatureKeysWithState);
							}}
						>
							State
						</button>
					)}
					{feature.hasConfigurableSettings && (
						<button
							className="rounded bg-[#3c3c3c] px-2 py-0.5 text-xs text-[#c586c0] hover:bg-[#4c4c4c]"
							onClick={(e) => {
								e.stopPropagation();
								onConfigClick(feature.id);
							}}
						>
							Config
						</button>
					)}
					{!feature.hasNestedEnabled && (
						<button
							className={cn("rounded px-2 py-1 text-xs font-medium", feature.enabled ? "bg-[#ce9178] text-[#1e1e1e]" : "bg-[#4ec9b0] text-[#1e1e1e]")}
							disabled={isTogglePending}
							onClick={(e) => {
								e.stopPropagation();
								void onToggle(feature.enabledPath ?? "enabled", feature.enabled);
							}}
						>
							{feature.enabled ? "Disable" : "Enable"}
						</button>
					)}
				</div>
			</div>
			{feature.hasNestedEnabled && isExpanded && (
				<div className="mt-3 space-y-2 pl-4">
					{feature.subFeatures?.map((sub) => (
						<div className="flex items-center justify-between rounded bg-[#252525] p-2" key={sub.key}>
							<span className="text-sm text-[#d4d4d4]">• {sub.key}</span>
							<button
								className={cn("rounded px-2 py-0.5 text-xs font-medium", sub.enabled ? "bg-[#ce9178] text-[#1e1e1e]" : "bg-[#4ec9b0] text-[#1e1e1e]")}
								disabled={isTogglePending}
								onClick={(e) => {
									e.stopPropagation();
									void onSubToggle(sub.path, sub.enabled);
								}}
							>
								{sub.enabled ? "Disable" : "Enable"}
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
