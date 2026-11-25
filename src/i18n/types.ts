/* eslint-disable perfectionist/sort-modules */
import type EnUS from "@/public/locales/en-US.json.d";

// ─── Core primitives ──────────────────────────────────────────────
type Text = string;
type StringMap = Record<string, Text>;

type Recursive<T> = {
	[key: string]: Recursive<T> | T;
};

// ─── Buttons & Toggles ────────────────────────────────────────────
export type ToggleStrings = {
	off: Text;
	on: Text;
};

export type ButtonBase = {
	label: Text;
};

export type ToggleButtonStrings = ButtonBase & {
	toggle: ToggleStrings;
};

export type SimpleButtonStrings = ButtonBase & {
	toggle?: never;
};

export type ButtonStrings = SimpleButtonStrings | ToggleButtonStrings;

// ─── Feature Strings ──────────────────────────────────────────────
export type FeatureStrings = {
	/**
	 * Primary button
	 */
	button?: ButtonStrings;
	/**
	 * Multiple buttons (e.g. speed +/-)
	 */
	buttons?: Record<string, ButtonStrings>;
	/**
	 * Feature-specific extension point
	 */
	extras?: Record<string, ButtonStrings | StringMap | Text>;
	/**
	 * One-off messages (copied, limits, warnings, status)
	 */
	messages?: StringMap;
	title?: Text;
};

// ─── Pages Content ────────────────────────────────────────────────
export type PagesContentStrings = {
	features: Record<string, FeatureStrings>;
};

// ─── Pages Options / Notifications ────────────────────────────────
export type OptionsNotificationLevel = "error" | "info" | "success";

export type OptionNotificationStrings = {
	[level in OptionsNotificationLevel]?: Recursive<Text>;
};

export type PagesOptionsStrings = {
	extras?: Recursive<Text>;
	notifications?: OptionNotificationStrings;
};

// ─── Pages ────────────────────────────────────────────────────────
export type PagesStrings = {
	content: PagesContentStrings;
	options: PagesOptionsStrings;
};

// ─── Settings ─────────────────────────────────────────────────────
type BaseSettingStrings = {
	label?: Text;
	title?: Text;
};

/**
 * A setting with no select block
 */
export type SimpleSettingStrings = BaseSettingStrings & {
	select?: never;
};

/**
 * A setting with a select block
 */
export type SelectSettingStrings = BaseSettingStrings & {
	select: {
		label: Text;
		options?: Record<string, StringMap> | StringMap;
		title: Text;
	};
};

export type SettingStrings = SelectSettingStrings | SimpleSettingStrings;

type Require<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type SettingsGroupStrings = {
	enable?: BaseSettingStrings;
	extras?: Recursive<Text>;
	settings?:
		| Record<string, SettingsGroupStrings | SettingStrings>
		| {
				sections: {
					miscellaneous: Record<string, Require<SettingsGroupStrings, "enable">>;
				};
		  };
	title?: Text;
};

export type SettingsStringsShape =
	| StringMap
	| {
			sections: Record<string, SettingsGroupStrings>;
	  };

export type TranslationShape = {
	langCode: string;
	langName: string;
	messages: StringMap;
	pages: PagesStrings;
	settings: SettingsStringsShape;
};
type Exact<T, U extends T> = Exclude<keyof U, keyof T> extends never ? U : never;

type _validateEnUS = Exact<TranslationShape, EnUS>;
