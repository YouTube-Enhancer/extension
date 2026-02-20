import Link from "@/src/components/Link";
import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { cn } from "@/src/utils/utilities";

export default function YouTubeDataApiKeySection() {
	const {
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.title)}>
			<SettingTitle />
			<Setting
				disabled={false}
				input_type="password"
				label={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.input.label)}
				onChange={setValueOption("youtube_data_api_v3_key")}
				parentSetting={null}
				title={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.input.title)}
				type="text-input"
				value={settings.youtube_data_api_v3_key}
			/>
			<fieldset className={cn("flex flex-row gap-1")}>
				<Link className="ml-2" href="https://developers.google.com/youtube/v3/getting-started" target="_blank">
					{t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.getApiKeyLinkText)}
				</Link>
			</fieldset>
		</SettingSection>
	);
}
