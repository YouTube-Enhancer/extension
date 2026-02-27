import type { SelectOption } from "@/src/components/Inputs";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { buttonNames } from "@/src/types";
import { isButtonSelectDisabled } from "@/src/utils/utilities";

export default function ButtonPlacementSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	const buttonPlacementOptions: SelectOption<
		| "buttonPlacement.copyTimestampUrlButton"
		| "buttonPlacement.decreasePlaybackSpeedButton"
		| "buttonPlacement.forwardButton"
		| "buttonPlacement.hideEndScreenCardsButton"
		| "buttonPlacement.increasePlaybackSpeedButton"
		| "buttonPlacement.loopButton"
		| "buttonPlacement.maximizePlayerButton"
		| "buttonPlacement.miniPlayerButton"
		| "buttonPlacement.openTranscriptButton"
		| "buttonPlacement.rewindButton"
		| "buttonPlacement.screenshotButton"
		| "buttonPlacement.volumeBoostButton"
	>[] = [
		{ label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.below_player.value), value: "below_player" },
		{ label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.feature_menu.value), value: "feature_menu" },
		{
			label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.player_controls_left.value),
			value: "player_controls_left"
		},
		{
			label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.player_controls_right.value),
			value: "player_controls_right"
		}
	];
	return (
		<SettingSection title={t((translations) => translations.pages.options.extras.buttonPlacement.title)}>
			<SettingTitle />
			{buttonNames.map((feature) => {
				const label = t((translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[feature]);
				return (
					<Setting
						disabled={isButtonSelectDisabled(feature, settings)}
						id={`buttonPlacement.${feature}`}
						key={feature}
						label={label}
						onChange={(change) => {
							switch (feature) {
								case "decreasePlaybackSpeedButton":
								case "increasePlaybackSpeedButton": {
									setValueOption(`buttonPlacement.decreasePlaybackSpeedButton`)(change);
									// Timeout required otherwise the button won't work
									setTimeout(() => setValueOption(`buttonPlacement.increasePlaybackSpeedButton`)(change), 25);
									break;
								}
								case "forwardButton":
								case "rewindButton": {
									setValueOption(`buttonPlacement.rewindButton`)(change);
									setTimeout(() => setValueOption(`buttonPlacement.forwardButton`)(change), 50);
									break;
								}
								default:
									setValueOption(`buttonPlacement.${feature}`)(change);
							}
						}}
						options={buttonPlacementOptions}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[feature]
						}}
						selectedOption={getSelectedOption(`buttonPlacement.${feature}` as const)}
						title={t((translations) => translations.pages.options.extras.buttonPlacement.select.title, {
							BUTTON_NAME: label.toLowerCase(),
							PLACEMENT: t(
								(translations) =>
									translations.pages.options.extras.buttonPlacement.select.options[getSelectedOption(`buttonPlacement.${feature}` as const)].placement
							)
						})}
						type="select"
					/>
				);
			})}
		</SettingSection>
	);
}
