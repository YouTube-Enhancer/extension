import type { JSX } from "react";

import { useQuery } from "@tanstack/react-query";

import type { FeatureKeysWithState } from "@/src/features/_registry/types";

import { featureStateQuery } from "../hooks/useDevToolsQuery";
import DevToolsLoader from "./DevToolsLoader";
import { DevToolsError } from "./DevToolsMessage";

type StateSlideOverProps = {
	featureId: FeatureKeysWithState | null;
	isOpen: boolean;
	onClose: () => void;
};

export default function StateSlideOver({ featureId, isOpen, onClose }: StateSlideOverProps): JSX.Element | null {
	const { data: stateData, isLoading } = useQuery(featureStateQuery(featureId as FeatureKeysWithState));

	if (!isOpen || !featureId) return null;

	const featureState = stateData?.state;

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative w-full max-w-lg overflow-y-auto bg-[#1e1e1e] p-4 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-medium text-[#d4d4d4]">{featureId} State</h2>
					<button className="rounded p-1 text-[#6b6b6b] hover:bg-[#3c3c3c] hover:text-[#d4d4d4]" onClick={onClose}>
						×
					</button>
				</div>

				<span className="mb-2 inline-block rounded bg-[#3c3c3c] px-2 py-1 text-xs text-[#9cdcfe]">Read-only</span>

				{isLoading && <DevToolsLoader message="Loading state..." />}

				{!isLoading && featureState === null && <DevToolsError message="No state available" />}

				{!isLoading && featureState !== null && (
					<pre className="overflow-auto rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4 text-sm text-[#d4d4d4]">
						{JSON.stringify(featureState, null, 2)}
					</pre>
				)}
			</div>
		</div>
	);
}
