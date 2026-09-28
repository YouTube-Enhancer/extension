import type { SelectOption } from "@/src/components/Inputs";

import { Select } from "@/src/components/Inputs";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { type AllButtonNames, type configuration, fullscreenPlacements, type Path } from "@/src/types";
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
		<SettingSection title={t((translations) => translations.pages.options.extras.buttonPlacement.title)}>
			<SettingTitle />
			{metadataRegistry.getAllButtonNames().map((buttonName) => {
				const label = t((translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[buttonName]);
				const valuePath = getPlacementPath(buttonName);
				const fullscreenValuePath = getFullscreenPlacementPath(buttonName);

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
	const featureId = metadataRegistry.getButtonFeature(buttonName)!;
	const configPath = metadataRegistry.getButtonConfigPath(buttonName)!;
	return `${featureId}.${configPath}.fullscreenPlacement` as
		| (`${string}.button.fullscreenPlacement` & Path<configuration>)
		| (`${string}.buttons.${string}.fullscreenPlacement` & Path<configuration>);
}
function getPlacementPath(
	buttonName: AllButtonNames
): (`${string}.button.placement` & Path<configuration>) | (`${string}.buttons.${string}.placement` & Path<configuration>) {
	const featureId = metadataRegistry.getButtonFeature(buttonName)!;
	const configPath = metadataRegistry.getButtonConfigPath(buttonName)!;
	return `${featureId}.${configPath}.placement` as
		| (`${string}.button.placement` & Path<configuration>)
		| (`${string}.buttons.${string}.placement` & Path<configuration>);
}
