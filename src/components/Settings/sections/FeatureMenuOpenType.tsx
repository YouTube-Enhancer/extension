import type { configuration } from "@/src/types";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
export default function FeatureMenuOpenTypeSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	const featureMenuAvailable = hasAnyFeatureMenuButton(settings);
	return (
		<SettingSection
			className="mb-3 break-inside-avoid rounded-xl bg-[var(--card-bg)] p-2 shadow-sm"
			title={t((translations) => translations.pages.options.extras.featureMenu.openType.title)}
		>
			<SettingTitle />
			<Setting
				disabled={!featureMenuAvailable}
				id="featureMenu.openType"
				label={t((translations) => translations.pages.options.extras.featureMenu.openType.select.label)}
				onChange={setValueOption("featureMenu.openType")}
				options={[
					{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.hover), value: "hover" },
					{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.click), value: "click" }
				]}
				parentSetting={{
					type: "specificOption",
					value: (translations) => translations.pages.options.extras.optionDisabled.specificOption.featureMenu
				}}
				selectedOption={getSelectedOption("featureMenu.openType")}
				title={t((translations) => translations.pages.options.extras.featureMenu.openType.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
function hasAnyFeatureMenuButton(settings: configuration): boolean {
	for (const value of Object.values(settings)) {
		if (typeof value !== "object" || value === null) continue;
		// Single-button features
		if ("button" in value) {
			if (value.button?.placement === "feature_menu") return true;
		}
		// Multi-button features
		if ("buttons" in value) {
			for (const btn of Object.values(value.buttons ?? {})) {
				if (btn.placement === "feature_menu") return true;
			}
		}
	}
	return false;
}
