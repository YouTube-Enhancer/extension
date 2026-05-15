import type { JSX } from "react";

import { useEffect, useState } from "react";

import { DevtoolsTranslationsProvider } from "@/src/components/devtools/hooks/useDevToolsTranslations/provider";
import { cn } from "@/src/utils/style";

import CoreConfigSection from "./components/CoreConfigSection";
import DependencyGraph from "./components/DependencyGraph";
import FeatureStatusGrid from "./components/FeatureStatusGrid";
import PerformanceMetrics from "./components/PerformanceMetrics";
import { setupDevToolsMessageListener, useDevToolsCacheSync } from "./hooks/useDevToolsQuery";

type TabId = "core" | "dependencies" | "features" | "performance";
export default function DevToolsPanel(): JSX.Element {
	const [activeTab, setActiveTab] = useState<TabId>("features");
	useEffect(() => {
		setupDevToolsMessageListener();
	}, []);
	useDevToolsCacheSync();

	const tabs: { id: TabId; label: string }[] = [
		{ id: "core", label: "Core Settings" },
		{ id: "features", label: "Feature Status" },
		{ id: "performance", label: "Performance" },
		{ id: "dependencies", label: "Dependencies" }
	];
	return (
		<DevtoolsTranslationsProvider>
			<div className="flex min-h-screen flex-col bg-[#1e1e1e] text-[#d4d4d4]">
				<div className="flex border-b border-[#3c3c3c]">
					{tabs.map((tab) => (
						<button
							className={cn(
								"px-4 py-2 text-sm transition-colors",
								activeTab === tab.id ?
									"border-b-2 border-[#007acc] bg-[#2d2d2d] text-[#ffffff]"
								:	"text-[#969696] hover:bg-[#2d2d2d] hover:text-[#ffffff]"
							)}
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
				<div className="flex-1 overflow-auto p-4">
					{activeTab === "core" && <CoreConfigSection />}
					{activeTab === "features" && <FeatureStatusGrid />}
					{activeTab === "performance" && <PerformanceMetrics />}
					{activeTab === "dependencies" && <DependencyGraph />}
				</div>
			</div>
		</DevtoolsTranslationsProvider>
	);
}
export function useDevtoolsTranslation() {}
