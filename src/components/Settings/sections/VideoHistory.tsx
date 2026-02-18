import type { SelectOption } from "@/src/components/Inputs";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function VideoHistorySection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const videoHistoryResumeTypeOptions: SelectOption<"video_history_resume_type">[] = [
		{
			label: t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.options.automatic),
			value: "automatic"
		},
		{
			label: t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.options.prompt),
			value: "prompt"
		}
	];
	return (
		<SettingSection title={t((translations) => translations.settings.sections.videoHistory.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_video_history?.toString() === "true"}
				label={t((translations) => translations.settings.sections.videoHistory.enable.label)}
				onChange={setCheckboxOption("enable_video_history")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.videoHistory.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_video_history?.toString() !== "true"}
				id="video_history_resume_type"
				label={t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.label)}
				onChange={setValueOption("video_history_resume_type")}
				options={videoHistoryResumeTypeOptions}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.videoHistory.enable.label
				}}
				selectedOption={getSelectedOption("video_history_resume_type")}
				title={t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
