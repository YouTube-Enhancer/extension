import { useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useState } from "react";
import browser from "webextension-polyfill";

import Switch from "@/src/components/Inputs/Switch/Switch";

export const FIRST_TIME_SETUP_KEY = "yte_first_time_setup_done";

type RecommendedFeature = {
	description: string;
	key: string;
	label: string;
};

const RECOMMENDED_FEATURES: RecommendedFeature[] = [
	{ description: "Remove Shorts from your YouTube feed", key: "hideShorts.enabled", label: "Hide Shorts" },
	{ description: "Keep your volume the same between videos", key: "rememberVolume.enabled", label: "Remember Volume" },
	{ description: "Strip tracking data from shared links", key: "removeRedirect.enabled", label: "Remove Tracking Links" },
	{ description: "Add a screenshot button to the video player", key: "screenshotButton.enabled", label: "Screenshot Button" },
	{ description: "Remove the yellow paid promotion banner", key: "hidePaidPromotionBanner.enabled", label: "Hide Paid Promotions" },
	{ description: "Auto-dismiss the 'Continue watching?' popup", key: "skipContinueWatching.enabled", label: "Skip 'Continue Watching'" },
	{ description: "Show remaining time instead of elapsed time", key: "remainingTime.enabled", label: "Show Remaining Time" },
	{ description: "Collapse the AI summary panel by default", key: "hideArtificialIntelligenceSummary.enabled", label: "Hide AI Summary" }
];

type Props = {
	onDismiss: () => void;
};

export async function shouldShowWelcomeModal(): Promise<boolean> {
	const result = await browser.storage.local.get(FIRST_TIME_SETUP_KEY);
	return !result[FIRST_TIME_SETUP_KEY];
}

export default function WelcomeModal({ onDismiss }: Props) {
	const queryClient = useQueryClient();
	const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(RECOMMENDED_FEATURES.map((f) => [f.key, true])));
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const raf = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(raf);
	}, []);

	function toggleFeature(key: string) {
		setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
	}

	async function handleGetStarted() {
		const updates: Record<string, unknown> = { [FIRST_TIME_SETUP_KEY]: true };

		for (const feature of RECOMMENDED_FEATURES) {
			if (!enabled[feature.key]) continue;
			const [featureName, settingName] = feature.key.split(".");
			const current = (await browser.storage.local.get(featureName))[featureName] as Record<string, unknown> | undefined;
			updates[featureName] = { ...(current ?? {}), [settingName]: true };
		}

		await browser.storage.local.set(updates);
		await queryClient.invalidateQueries({ queryKey: ["settings"] });
		close();
	}

	async function handleCustomize() {
		await browser.storage.local.set({ [FIRST_TIME_SETUP_KEY]: true });
		close();
	}

	function close() {
		setVisible(false);
		setTimeout(onDismiss, 250);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
			style={{
				opacity: visible ? 1 : 0,
				transition: "opacity 200ms ease"
			}}
		>
			<div
				className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-[#1e2021]"
				style={{
					opacity: visible ? 1 : 0,
					transform: visible ? "scale(1)" : "scale(0.92)",
					transition: "transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease"
				}}
			>
				<div className="px-6 pb-5 pt-6">
					<div className="mb-1 flex items-center gap-2">
						<img alt="YouTube Enhancer" className="size-8" src="/icons/icon_128.png" />
						<h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome to YouTube Enhancer!</h2>
					</div>
					<p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
						We pre-selected some great settings for you. Toggle any off and click Get Started.
					</p>

					<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Recommended Settings</p>

					<div className="space-y-3">
						{RECOMMENDED_FEATURES.map((feature) => (
							<div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/60" key={feature.key}>
								<div className="mr-3 min-w-0">
									<p className="text-sm font-medium text-gray-800 dark:text-gray-200">{feature.label}</p>
									<p className="truncate text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
								</div>
								<Switch
									checked={enabled[feature.key]}
									disabled={false}
									label=""
									onChange={(e: ChangeEvent<HTMLInputElement>) => {
										void e;
										toggleFeature(feature.key);
									}}
									title={feature.label}
								/>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-700/50">
					<button
						className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
						onClick={() => void handleGetStarted()}
						type="button"
					>
						Get Started
					</button>
					<button
						className="w-full rounded-xl py-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						onClick={() => void handleCustomize()}
						type="button"
					>
						Customize Settings
					</button>
				</div>
			</div>
		</div>
	);
}
