import type { SelectOption } from "@/src/components/Inputs";

import { Select } from "@/src/components/Inputs";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { type AllButtonNames, buttonNames, type configuration, fullscreenPlacements, type Path } from "@/src/types";
import { isButtonSelectDisabled } from "@/src/utils/settings";

export default function ButtonPlacementSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	const buttonPlacementOptions: SelectOption<"copyTimestampUrlButton.button.placement">[] = [
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
	const fullscreenPlacementOptions = fullscreenPlacements.map((p) => ({
		label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options[p].value),
		value: p
	}));
	return (
		<SettingSection
			className="mb-3 break-inside-avoid rounded-xl bg-[var(--card-bg)] p-2 shadow-sm"
			title={t((translations) => translations.pages.options.extras.buttonPlacement.title)}
		>
			<SettingTitle />
			{buttonNames.map((buttonName) => {
				const label = t((translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[buttonName]);
				const valuePath = getPlacementPath(buttonName);
				const fullscreenValuePath = getFullscreenPlacementPath(buttonName);
				if (!valuePath || !fullscreenValuePath) return null;
				const disabled = isButtonSelectDisabled(buttonName, settings);
				const tooltip = t((translations) => translations.pages.options.extras.buttonPlacement.select.title, {
					BUTTON_NAME: label.toLowerCase(),
					PLACEMENT: t((translations) => translations.pages.options.extras.buttonPlacement.select.options[getSelectedOption(valuePath)].placement)
				});
				const fullscreenTooltip = t((translations) => translations.pages.options.extras.buttonPlacement.select.fullscreenTitle, {
					BUTTON_NAME: label.toLowerCase(),
					PLACEMENT: t(
						(translations) => translations.pages.options.extras.buttonPlacement.select.options[getSelectedOption(fullscreenValuePath)].placement
					)
				});
				return (
					<div className="mx-2 mb-3" key={buttonName}>
						<div className="mb-1 text-sm font-medium">{label}</div>
						<div className="flex items-center justify-between gap-3">
							<div title={tooltip}>
								<Select
									disabled={disabled}
									id={valuePath}
									label={t((translations) => translations.pages.options.extras.buttonPlacement.select.normalLabel)}
									onChange={(e) => setValueOption(valuePath)(e)}
									options={buttonPlacementOptions}
									selectedOption={getSelectedOption(valuePath)}
									title={tooltip}
								/>
							</div>
							<div title={fullscreenTooltip}>
								<Select
									disabled={disabled}
									id={fullscreenValuePath}
									label={t((translations) => translations.pages.options.extras.buttonPlacement.select.fullscreenLabel)}
									onChange={(e) => setValueOption(fullscreenValuePath)(e)}
									options={fullscreenPlacementOptions}
									selectedOption={getSelectedOption(fullscreenValuePath)}
									title={fullscreenTooltip}
								/>
							</div>
						</div>
					</div>
				);
			})}
		</SettingSection>
	);
}
function getFullscreenPlacementPath(
	buttonName: AllButtonNames
): (`${string}.button.fullscreenPlacement` & Path<configuration>) | (`${string}.buttons.${string}.fullscreenPlacement` & Path<configuration>) {
	switch (buttonName) {
		case "decreasePlaybackSpeedButton":
		case "increasePlaybackSpeedButton":
			return "playbackSpeedButtons.button.fullscreenPlacement";
		case "flipVideoHorizontalButton":
		case "flipVideoVerticalButton":
			return `flipVideoButtons.buttons.${buttonName}.fullscreenPlacement`;
		case "forwardButton":
		case "rewindButton":
			return "forwardRewindButtons.button.fullscreenPlacement";
		case "volumeBoostButton":
			return "volumeBoost.button.fullscreenPlacement";
		default:
			return `${buttonName}.button.fullscreenPlacement`;
	}
}
function getPlacementPath(
	buttonName: AllButtonNames
): (`${string}.button.placement` & Path<configuration>) | (`${string}.buttons.${string}.placement` & Path<configuration>) {
	switch (buttonName) {
		case "decreasePlaybackSpeedButton":
		case "increasePlaybackSpeedButton":
			return "playbackSpeedButtons.button.placement";
		case "flipVideoHorizontalButton":
		case "flipVideoVerticalButton":
			return `flipVideoButtons.buttons.${buttonName}.placement`;
		case "forwardButton":
		case "rewindButton":
			return "forwardRewindButtons.button.placement";
		case "volumeBoostButton":
			return "volumeBoost.button.placement";
		default:
			return `${buttonName}.button.placement`;
	}
}
