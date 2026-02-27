import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
export default function PlayerQualitySection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const YouTubePlayerQualityOptions = [
		{ label: "144p", value: "tiny" },
		{ label: "240p", value: "small" },
		{ label: "360p", value: "medium" },
		{ label: "480p", value: "large" },
		{ label: "720p", value: "hd720" },
		{ label: "1080p", value: "hd1080" },
		{ label: "1440p", value: "hd1440" },
		{ label: "2160p", value: "hd2160" },
		{ label: "2880p", value: "hd2880" },
		{ label: "4320p", value: "highres" },
		{ label: "auto", value: "auto" }
		// This cast is here because otherwise it would require marking all the options 'as const'
	].reverse() as SelectOption<"playerQuality.quality">[];
	const PlayerQualityFallbackStrategyOptions = [
		{
			label: t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.options.higher),
			value: "higher"
		},
		{
			label: t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.options.lower),
			value: "lower"
		}
	] as SelectOption<"playerQuality.fallbackStrategy">[];
	const automaticQualityParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.playerQuality.enable.label
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.playerQuality.title)}>
			<SettingTitle />
			<Setting
				checked={settings.playerQuality.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playerQuality.enable.label)}
				onChange={setCheckboxOption("playerQuality.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playerQuality.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.playerQuality.enabled?.toString() !== "true"}
				id="playerQuality.quality"
				label={t((translations) => translations.settings.sections.playerQuality.settings.quality.select.label)}
				onChange={setValueOption("playerQuality.quality")}
				options={YouTubePlayerQualityOptions}
				parentSetting={automaticQualityParentSetting}
				selectedOption={getSelectedOption("playerQuality.quality")}
				title={t((translations) => translations.settings.sections.playerQuality.settings.quality.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.playerQuality.enabled?.toString() !== "true"}
				id="playerQuality.fallbackStrategy"
				label={t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.label)}
				onChange={setValueOption("playerQuality.fallbackStrategy")}
				options={PlayerQualityFallbackStrategyOptions}
				parentSetting={automaticQualityParentSetting}
				selectedOption={getSelectedOption("playerQuality.fallbackStrategy")}
				title={t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
