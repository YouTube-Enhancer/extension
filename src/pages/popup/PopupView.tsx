import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { MdOpenInNew } from "react-icons/md";
import browser from "webextension-polyfill";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { applyTheme, getUiTheme } from "@/src/utils/uiTheme";

const QUICK_FEATURES = [
	{ description: "Remove Shorts from your YouTube feed", key: "hideShorts.enabled", label: "Hide Shorts" },
	{ description: "Keep your volume the same between videos", key: "rememberVolume.enabled", label: "Remember Volume" },
	{ description: "Strip tracking data from shared links", key: "removeRedirect.enabled", label: "Remove Tracking Links" },
	{ description: "Add a screenshot button to the video player", key: "screenshotButton.enabled", label: "Screenshot Button" },
	{ description: "Remove the yellow paid promotion banner", key: "hidePaidPromotionBanner.enabled", label: "Hide Paid Promotions" },
	{ description: "Auto-dismiss the 'Continue watching?' popup", key: "skipContinueWatching.enabled", label: "Skip 'Continue Watching'" },
	{ description: "Show remaining time instead of elapsed time", key: "remainingTime.enabled", label: "Show Remaining Time" },
	{ description: "Collapse the AI summary panel by default", key: "hideArtificialIntelligenceSummary.enabled", label: "Hide AI Summary" }
] as const;

type QuickSettings = Record<string, boolean>;

export default function PopupView() {
	const queryClient = useQueryClient();
	const wrapperRef = useRef<HTMLDivElement>(null);

	const { data: quickSettings } = useQuery({
		queryFn: fetchQuickSettings,
		queryKey: ["popup-settings"],
		refetchInterval: 500,
		staleTime: 250
	});

	const toggleMutation = useMutation({
		mutationFn: async ({ featureKey, newValue }: { featureKey: string; newValue: boolean }) => {
			const [featureName, settingName] = featureKey.split(".");
			const stored = await browser.storage.local.get(featureName);
			const current = stored[featureName] as Record<string, unknown> | undefined;
			await browser.storage.local.set({ [featureName]: { ...(current ?? {}), [settingName]: newValue } });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["popup-settings"] });
		}
	});

	useEffect(() => {
		void (async () => {
			const theme = await getUiTheme();
			if (wrapperRef.current) applyTheme(theme, wrapperRef.current);
		})();
	}, []);

	function openSettings() {
		const url = chrome.runtime.getURL("src/pages/options/index.html");
		void chrome.tabs.create({ url });
		window.close();
	}

	return (
		<div
			className="flex flex-col overflow-hidden rounded-xl border border-gray-200/40 bg-[#f5f5f5] text-black shadow-xl dark:border-gray-700/40 dark:bg-[#181a1b] dark:text-white"
			ref={wrapperRef}
		>
			<div className="flex items-center gap-2.5 border-b border-gray-200 px-4 py-3 dark:border-gray-700/50">
				<img alt="YouTube Enhancer" className="size-7" src="/icons/icon_128.png" />
				<div>
					<p className="text-sm font-bold text-gray-900 dark:text-white">YouTube Enhancer</p>
					<p className="text-[10px] text-gray-400">v{chrome.runtime.getManifest().version}</p>
				</div>
				<button
					className="bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors"
					onClick={openSettings}
					title="Open full settings"
					type="button"
				>
					All Settings
					<MdOpenInNew size={12} />
				</button>
			</div>

			<div className="flex flex-col py-2">
				<p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Quick Settings</p>
				{QUICK_FEATURES.map((feature) => {
					const isOn = quickSettings?.[feature.key] ?? false;
					return (
						<div
							className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/40"
							key={feature.key}
						>
							<div className="mr-3 min-w-0">
								<p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feature.label}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
							</div>
							<button
								aria-checked={isOn}
								className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors duration-200 ease-in-out ${
									isOn ? "bg-[var(--accent)]" : "bg-gray-300 dark:bg-gray-600"
								}`}
								onClick={() => toggleMutation.mutate({ featureKey: feature.key, newValue: !isOn })}
								role="switch"
								type="button"
							>
								<span
									className={`block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
										isOn ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

async function fetchQuickSettings(): Promise<QuickSettings> {
	const featureKeys = [...new Set(QUICK_FEATURES.map((f) => f.key.split(".")[0]))];
	const stored = await browser.storage.local.get(featureKeys);
	const result: QuickSettings = {};
	for (const feature of QUICK_FEATURES) {
		const [featureName, settingName] = feature.key.split(".");
		const featureObj = stored[featureName] as Record<string, unknown> | undefined;
		result[feature.key] = Boolean(featureObj?.[settingName]);
	}
	return result;
}
