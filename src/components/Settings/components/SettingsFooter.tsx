import { MdDeleteOutline, MdRestartAlt } from "react-icons/md";
import browser from "webextension-polyfill";

import { getSettings, useSettings } from "@/src/components/Settings/Settings";
import { useNotifications } from "@/src/hooks";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { updateStoredSettings } from "@/src/utils/config/storage";

export default function DataManagementSection() {
	const {
		i18nInstance: { t },
		settings,
		settingsMutate
	} = useSettings();
	const { addNotification, notifications, removeNotification } = useNotifications();
	const defaultConfiguration = getDefaultConfiguration();

	async function refreshSettings() {
		await updateStoredSettings();
		settingsMutate.mutate(await getSettings());
	}

	function resetOptions() {
		addNotification("info", (translations) => translations.pages.options.notifications.info.reset, "reset_settings");
	}

	function clearData() {
		void (async () => {
			const userHasConfirmed = window.confirm(t((translations) => translations.pages.options.extras.clearData.confirmAlert));
			if (userHasConfirmed) {
				void browser.storage.local.set(defaultConfiguration);
				await refreshSettings();
				addNotification("success", (translations) => translations.pages.options.extras.clearData.allDataDeleted);
			}
		})();
	}

	const isConfirmingReset = notifications.filter((n) => n.action === "reset_settings").length > 0;

	return (
		<div className="rounded-xl bg-[var(--card-bg)] p-3 shadow-sm">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Data Management</p>
			<div className="flex gap-2">
				<button
					className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
					id="clear_data_button"
					onClick={clearData}
					title={t((translations) => translations.pages.options.extras.bottomButtons.clear.title)}
					type="button"
				>
					<MdDeleteOutline size={16} />
					{t((translations) => translations.pages.options.extras.bottomButtons.clear.value)}
				</button>

				{isConfirmingReset ?
					<button
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600"
						id="confirm_button"
						onClick={() => {
							void (async () => {
								const notificationToRemove = notifications.find((n) => n.action === "reset_settings");
								if (notificationToRemove) {
									removeNotification(notificationToRemove);
								}
								void browser.storage.local.set({ ...defaultConfiguration, ...{ rememberVolume: settings.rememberVolume } });
								await refreshSettings();
								addNotification("success", (translations) => translations.pages.options.notifications.success.saved);
							})();
						}}
						title={t((translations) => translations.pages.options.extras.bottomButtons.confirm.title)}
						type="button"
					>
						{t((translations) => translations.pages.options.extras.bottomButtons.confirm.value)}
					</button>
				:	<button
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
						id="reset_button"
						onClick={resetOptions}
						title={t((translations) => translations.pages.options.extras.bottomButtons.reset.title)}
						type="button"
					>
						<MdRestartAlt size={16} />
						{t((translations) => translations.pages.options.extras.bottomButtons.reset.value)}
					</button>
				}
			</div>
		</div>
	);
}
