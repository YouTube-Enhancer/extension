import { type ChangeEvent, Fragment } from "react";

import type { configuration, Nullable, TSelectFunc } from "@/src/types";

import Link from "@/src/components/Link";
import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import {
	type FeatureKeys,
	type FeatureSettingNode,
	isDividerNode,
	isGroupNode,
	isSettingNode,
	isTextNode,
	type SettingComponent,
	type SettingCondition,
	type SettingsSectionId
} from "@/src/features/_registry/types";
import { getPathValue } from "@/src/utils/misc";
import { cn } from "@/src/utils/style";
type ConditionSetting = "equals" | "notEquals";

const DEFAULT_SECTION: SettingsSectionId = "miscellaneous";

type SectionData = {
	featureMap: Map<number, FeatureKeys>;
	sectionTitle?: TSelectFunc;
	settings: SettingsEntry[];
};
type SettingsEntry = {
	featureId: FeatureKeys;
	node: unknown;
};
export function evaluateConditions<F extends FeatureKeys>(
	conditions: SettingCondition<F>[] | undefined,
	settings: configuration,
	mode: "disabled" | "visible" = "visible"
): boolean {
	if (!conditions || conditions.length === 0) return mode === "visible";
	if (mode === "disabled") {
		return conditions.some((condition) => evaluateCondition(condition, settings));
	}
	return conditions.every((condition) => evaluateCondition(condition, settings));
}

export default function SettingsGenerator() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const allFeatures = metadataRegistry.getAll();
	const sections: Partial<Record<SettingsSectionId, SectionData>> = {};
	for (const feature of allFeatures) {
		const { sectionTitle, settings: featureSettings } = feature;
		if (!featureSettings) continue;
		for (const node of featureSettings) {
			const sectionId = getSectionId(node) ?? DEFAULT_SECTION;
			if (!sections[sectionId]) {
				sections[sectionId] = { featureMap: new Map(), sectionTitle: undefined, settings: [] };
			}
			sections[sectionId].settings.push({ featureId: feature.id, node: node as FeatureSettingNode<FeatureKeys> });
			if (sectionTitle) {
				sections[sectionId].sectionTitle = sectionTitle;
			} else if (sectionId === "miscellaneous" && !sections[sectionId].sectionTitle) {
				sections[sectionId].sectionTitle = (tr) => tr((tr) => tr.settings.sections.miscellaneous.title);
			}
		}
	}
	const sectionKeys = Object.keys(sections).sort((a, b) => {
		if (a === "miscellaneous") return -1;
		if (b === "miscellaneous") return 1;
		if (a === "customCSS") return 1;
		if (b === "customCSS") return -1;
		return a.localeCompare(b);
	});
	for (const sectionId of sectionKeys) {
		const { [sectionId]: section } = sections;
		if (!section) continue;
		const flattened = flattenSettingsByComponent(section.settings);
		sections[sectionId]!.settings = flattened;
	}
	for (const sectionId of sectionKeys) {
		const { [sectionId]: section } = sections;
		if (!section) continue;
		for (let i = 0; i < section.settings.length; i++) {
			section.featureMap.set(i, section.settings[i].featureId);
		}
	}
	if (sectionKeys.length === 0) {
		return null;
	}
	const renderNode = <F extends FeatureKeys>(node: FeatureSettingNode<F>, featureId: F, nodeIndex: number): React.ReactNode => {
		if (isDividerNode(node)) {
			return <hr className="my-2 border-gray-300 dark:border-gray-600" key={`divider-${featureId}-${nodeIndex}`} />;
		}
		if (isTextNode(node)) {
			return (
				<p className="mx-2 text-sm text-gray-600 dark:text-gray-400" key={`text-${featureId}-${nodeIndex}`}>
					{node.content(t)}
				</p>
			);
		}
		if (isGroupNode(node)) {
			if (node.attribution && node.attribution.length > 0) {
				return (
					<Fragment key={`group-${featureId}-${nodeIndex}`}>
						<fieldset className={cn("flex flex-row gap-1")}>
							{node.attribution.map((author, authorIndex) => (
								<fieldset className={cn("flex flex-row gap-1")} key={authorIndex}>
									<legend className="mb-1 text-lg sm:text-xl md:text-2xl">{author.label(t)}</legend>
									<Link href={author.url}>{author.url.split("/").pop()}</Link>
								</fieldset>
							))}
						</fieldset>
						{node.children.map((child, childIndex) => renderNode(child, featureId, childIndex))}
					</Fragment>
				);
			}
			return node.children.map((child, childIndex) => renderNode(child, featureId, childIndex));
		}
		if (isSettingNode(node)) {
			if (node.visibleWhen && !evaluateConditions(node.visibleWhen, settings)) return null;
			const { id: settingId } = node;
			const currentValue = getPathValue(settings, settingId);
			let parentSettingValue: Nullable<parentSetting> = null;
			if (node.parentSetting) {
				if (typeof node.parentSetting === "function") {
					const { [featureId]: featureSettings } = settings;
					parentSettingValue = node.parentSetting(featureSettings);
				} else {
					({ parentSetting: parentSettingValue } = node);
				}
			}
			const isDisabled = evaluateConditions(node.disabledWhen, settings, "disabled");
			const disabledReason = node.disabledReason ? node.disabledReason(t) : undefined;
			if (node.component === "checkbox") {
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						checked={currentValue as boolean}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						id={settingId}
						key={settingId}
						label={node.label(t)}
						onChange={setCheckboxOption(settingId as Parameters<typeof setCheckboxOption>[0])}
						parentSetting={parentSettingValue}
						title={node.title(t)}
						type="checkbox"
					/>
				);
			}
			if (node.component === "number") {
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						id={settingId}
						key={settingId}
						label={node.label(t)}
						max={node.max}
						min={node.min}
						onChange={setValueOption(settingId)}
						parentSetting={parentSettingValue}
						step={node.step}
						title={node.title(t)}
						type="number"
						value={currentValue as number}
					/>
				);
			}
			if (node.component === "slider") {
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						initialValue={currentValue as number}
						key={settingId}
						max={node.max}
						min={node.min}
						onChange={setValueOption(settingId)}
						parentSetting={parentSettingValue}
						step={node.step}
						type="slider"
					/>
				);
			}
			if (node.component === "select") {
				const selectedOption = typeof currentValue === "string" ? currentValue : "";
				const optionsRaw = node.optionsFrom ? node.optionsFrom() : (node.options ?? []);
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						id={settingId}
						key={settingId}
						label={node.label(t)}
						onChange={setValueOption(settingId)}
						options={optionsRaw.map((opt) => {
							const labelText = opt.label(t);
							return { label: labelText, value: opt.value };
						})}
						parentSetting={parentSettingValue}
						selectedOption={selectedOption}
						title={node.title(t)}
						type="select"
					/>
				);
			}
			if (node.component === "color-picker") {
				const value = typeof currentValue === "string" ? currentValue : "";
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						key={settingId}
						label={node.label(t)}
						onChange={setValueOption(settingId)}
						parentSetting={parentSettingValue}
						title={node.title(t)}
						type="color-picker"
						value={value}
					/>
				);
			}
			if (node.component === "text-input") {
				const value = typeof currentValue === "string" ? currentValue : "";
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						id={settingId}
						input_type={node.input_type ?? "text"}
						key={settingId}
						label={node.label(t)}
						onChange={setValueOption(settingId)}
						parentSetting={parentSettingValue}
						title={node.title(t)}
						type="text-input"
						value={value}
					/>
				);
			}
			if (node.component === "css-editor") {
				const value = typeof currentValue === "string" ? currentValue : "";
				const onChange = (newValue: string) => {
					const event = { currentTarget: { value: newValue } } as ChangeEvent<HTMLInputElement>;
					setValueOption(settingId)(event);
				};
				return (
					<Setting
						alwaysVisible={node.alwaysVisible}
						disabled={isDisabled}
						disabledReason={disabledReason}
						featureId={featureId}
						key={settingId}
						onChange={onChange}
						parentSetting={parentSettingValue}
						type="css-editor"
						value={value}
					/>
				);
			}
		}
		return null;
	};

	return (
		<>
			{sectionKeys.map((sectionId) => {
				const { [sectionId]: sectionData } = sections;
				if (!sectionData) return null;
				const { featureMap: sectionFeatureMap, sectionTitle: storedSectionTitle, settings: sectionSettingsList } = sectionData;

				return (
					<SettingSection featureIds={Array.from(sectionFeatureMap.values())} key={sectionId} title={storedSectionTitle ? storedSectionTitle(t) : ""}>
						<SettingTitle />
						{sectionSettingsList.map((entry, index: number) => {
							return renderNode(entry.node as FeatureSettingNode<FeatureKeys>, entry.featureId, index);
						})}
					</SettingSection>
				);
			})}
		</>
	);
}

function evaluateCondition<F extends FeatureKeys>(condition: SettingCondition<F>, settings: configuration): boolean {
	const { setting: settingPath } = condition;
	const actualValue = getPathValue(settings, settingPath);
	const checkValue = condition.equals ?? condition.notEquals;
	const mode: ConditionSetting = condition.equals !== undefined ? "equals" : "notEquals";
	if (mode === "equals") {
		return actualValue === checkValue;
	}
	return actualValue !== checkValue;
}

function flattenSettingsByComponent<F extends FeatureKeys>(entries: SettingsEntry[]): SettingsEntry[] {
	const byComponent: Partial<Record<"other" | SettingComponent<F>, SettingsEntry[]>> = {};
	for (const entry of entries) {
		const { node } = entry;
		if (isGroupNode(node)) {
			for (const child of node.children) {
				if (isSettingNode(child) || isDividerNode(child) || isTextNode(child)) {
					const component = isSettingNode(child) ? child.component : "other";
					if (!byComponent[component]) {
						byComponent[component] = [];
					}
					byComponent[component].push({ featureId: entry.featureId, node: child });
				}
			}
		} else if (isSettingNode(node) || isDividerNode(node) || isTextNode(node)) {
			const component = isSettingNode(node) ? node.component : "other";
			if (!byComponent[component]) {
				byComponent[component] = [];
			}
			byComponent[component].push(entry);
		}
	}
	const result: SettingsEntry[] = [];

	for (const component of Object.keys(byComponent)) {
		const { [component]: entries } = byComponent;
		if (entries) {
			result.push(...entries);
		}
	}

	return result;
}

function getSectionId(node: unknown): SettingsSectionId | undefined {
	if (typeof node !== "object" || node === null) {
		return undefined;
	}
	if ("section" in node && typeof node.section === "string" && node.section) {
		return node.section as SettingsSectionId;
	}
	if ("children" in node && Array.isArray(node.children)) {
		const { children } = node;
		for (const child of children) {
			const childSection = getSectionId(child);
			if (childSection) {
				return childSection;
			}
		}
	}
	return undefined;
}
