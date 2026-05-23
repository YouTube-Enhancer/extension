import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/src/utils/style";

export type TabDefinition = {
	icon?: ReactNode;
	id: TabId;
	label: string;
};

export type TabId = "advanced" | "appearance" | "basic";

type TabBarProps = {
	activeTab: TabId;
	onChange: (id: TabId) => void;
	tabs: TabDefinition[];
};

export default function TabBar({ activeTab, onChange, tabs }: TabBarProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
	const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

	useEffect(() => {
		const activeEl = tabRefs.current.get(activeTab);
		const { current: container } = containerRef;
		if (!activeEl || !container) return;
		const containerRect = container.getBoundingClientRect();
		const tabRect = activeEl.getBoundingClientRect();
		setIndicatorStyle({
			left: tabRect.left - containerRect.left,
			width: tabRect.width
		});
	}, [activeTab]);

	return (
		<div className="px-3 pb-2 pt-1">
			<div className="relative flex rounded-full bg-gray-200 p-1 dark:bg-gray-700/60" ref={containerRef} role="tablist">
				<div
					className="absolute top-1 rounded-full bg-white shadow-sm dark:bg-gray-500/80"
					style={{
						height: "calc(100% - 8px)",
						left: indicatorStyle.left,
						transition: "left 220ms cubic-bezier(0.25,0.8,0.25,1), width 220ms cubic-bezier(0.25,0.8,0.25,1)",
						width: indicatorStyle.width
					}}
				/>
				{tabs.map((tab) => (
					<button
						aria-selected={activeTab === tab.id}
						className={cn(
							"relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200",
							activeTab === tab.id ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						)}
						key={tab.id}
						onClick={() => onChange(tab.id)}
						ref={(el) => {
							if (el) tabRefs.current.set(tab.id, el);
						}}
						role="tab"
						type="button"
					>
						{tab.icon && <span className="text-base leading-none">{tab.icon}</span>}
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
