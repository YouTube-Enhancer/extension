import type { SelectOption } from "@/src/components/Inputs";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { type AllButtonNames, buttonNames } from "@/src/types";
import { isButtonSelectDisabled } from "@/src/utils/utilities";

export default function ButtonPlacementSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	const buttonPlacementOptions: SelectOption<
		| "button_placements.copyTimestampUrlButton"
		| "button_placements.decreasePlaybackSpeedButton"
		| "button_placements.forwardButton"
		| "button_placements.hideEndScreenCardsButton"
		| "button_placements.increasePlaybackSpeedButton"
		| "button_placements.loopButton"
		| "button_placements.maximizePlayerButton"
		| "button_placements.miniPlayerButton"
		| "button_placements.openTranscriptButton"
		| "button_placements.rewindButton"
		| "button_placements.screenshotButton"
		| "button_placements.volumeBoostButton"
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
						id={`button_placements.${feature}` as `button_placements.${AllButtonNames}`}
						key={feature}
						label={label}
						onChange={(change) => {
							switch (feature) {
								case "decreasePlaybackSpeedButton":
								case "increasePlaybackSpeedButton": {
									setValueOption(`button_placements.decreasePlaybackSpeedButton`)(change);
									// Timeout required otherwise the button won't work
									setTimeout(() => setValueOption(`button_placements.increasePlaybackSpeedButton`)(change), 25);
									break;
								}
								case "forwardButton":
								case "rewindButton": {
									setValueOption(`button_placements.rewindButton`)(change);
									setTimeout(() => setValueOption(`button_placements.forwardButton`)(change), 50);
									break;
								}
								default:
									setValueOption(`button_placements.${feature}`)(change);
							}
						}}
						options={buttonPlacementOptions}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[feature]
						}}
						selectedOption={getSelectedOption(`button_placements.${feature}`)}
						title={t((translations) => translations.pages.options.extras.buttonPlacement.select.title, {
							BUTTON_NAME: label.toLowerCase(),
							PLACEMENT: t(
								(translations) =>
									translations.pages.options.extras.buttonPlacement.select.options[getSelectedOption(`button_placements.${feature}`)].placement
							)
						})}
						type="select"
					/>
				);
			})}
		</SettingSection>
	);
}
