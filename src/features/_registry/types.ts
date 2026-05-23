import type { z } from "zod/v4-mini";

import type EnUS from "@/public/locales/en-US.json.d";
import type { parentSetting } from "@/src/components/Settings/components/Setting";
import type { PlayerControllerState } from "@/src/features/maximizePlayerButton/utils";
import type { MiniPlayerRect } from "@/src/features/miniPlayer/controller";
import type { RememberedVolumes } from "@/src/features/rememberVolume/types";
import type { VideoHistoryStorage } from "@/src/features/videoHistory/types";
import type {
	buttonNameToSettingName,
	ButtonPlacement,
	configuration,
	configurationKeys,
	FullscreenPlacement,
	MaybePromise,
	Nullable,
	Path,
	PathValue,
	TSelectFunc
} from "@/src/types";
export const coreFeatureKeys = ["featureMenu", "onScreenDisplay"] as const;
export type AnyFeatureBase = FeatureBaseWithoutState<Exclude<FeatureKeys, FeatureKeysWithState>> | FeatureBaseWithState<FeatureKeysWithState>;

export type AttributionEntry = {
	label: TSelectFunc;
	url: string;
};

export type BooleanSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "checkbox";
};

export type ButtonsForFeature<F extends FeatureKeys> = {
	[K in keyof typeof buttonNameToSettingName]: (typeof buttonNameToSettingName)[K] extends F ? K : never;
}[keyof typeof buttonNameToSettingName];

export type ButtonTrackedState = {
	/**
	 * Indicates whether the button is enabled.
	 */
	enabled: boolean;
	/**
	 * The fullscreen placement of the button.
	 */
	fullscreenPlacement: FullscreenPlacement;
	/**
	 * Indicates whether the button has been initialized.
	 */
	initialized: boolean;
	/**
	 * The placement of the button.
	 */
	placement?: ButtonPlacement;
};
export type ColorPickerSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "color-picker";
};

export type CoreFeatureKeys = (typeof coreFeatureKeys)[number];
export type DividerNode = {
	type: "divider";
};
export type FeatureBase<K extends FeatureKeys> =
	K extends FeatureKeysWithState ? FeatureBaseWithState<K>
	: K extends Exclude<FeatureKeys, FeatureKeysWithState> ? FeatureBaseWithoutState<K>
	: never;
export type FeatureBaseWithoutState<K extends Exclude<FeatureKeys, FeatureKeysWithState>> = FeatureMetadataBase<K> &
	FeatureMetadataWithoutState<K> &
	FeatureWithoutStateBranch<K> & {
		/**
		 * Optional buttons the feature can add/remove
		 * @remarks Only features with buttons can define this
		 */
		buttons?: K extends FeatureKeysWithButtons ? FeatureButton<K>[] : never;
		/**
		 * Schema for validation (used to build validation schema dynamically)
		 * @param config The configuration to validate
		 * @returns A promise that resolves when the validation has finished
		 */
		schema?: z.ZodMiniObject<ZodShapeExact<MustContainEnabled<configuration[K]>>>;
		/**
		 * Not allowed for feature without state
		 */
		stateSchema?: never;
	};
export type FeatureBaseWithState<K extends FeatureKeysWithState> = FeatureMetadataBase<K> &
	FeatureMetadataWithState<K> &
	FeatureWithStateBranch<K> & {
		/**
		 * Optional buttons the feature can add/remove
		 * @remarks Only features with buttons can define this
		 */
		buttons?: K extends FeatureKeysWithButtons ? FeatureButton<K>[] : never;
		/**
		 * Schema for validation (used to build validation schema dynamically)
		 * @param config The configuration to validate
		 * @returns A promise that resolves when the validation has finished
		 */
		schema?: z.ZodMiniObject<ZodShapeExact<MustContainEnabled<configuration[K]>>>;
		/**
		 * Schema for validating feature state (used to build validation schema dynamically)
		 * @remarks This is used to validate persisted state and ensure backward compatibility
		 */
		stateSchema?: z.ZodMiniObject<ZodShapeExact<FeatureState[FeatureStateKeys]>>;
	};
export type FeatureButton<K extends FeatureKeys = FeatureKeys> = {
	/**
	 * Adds a button to the feature
	 * @param {configuration[K]} options - Option to override the default configuration.
	 * @returns A promise that resolves when the button has been added.
	 */
	add: (options: configuration[K]) => Promise<void>;
	/**
	 * The name of the feature this button belongs to
	 */
	name: K extends FeatureKeysWithButtons ? ButtonsForFeature<K> : never;
	/**
	 * Removes a button from the feature
	 * @param {ButtonPlacement} placement - The placement of the button to remove.
	 * @returns A promise that resolves when the button has been removed.
	 */
	remove: (placement?: ButtonPlacement) => Promise<void>;
	/**
	 * Checks if the feature should render a button
	 * @param {configuration[K]} config - The configuration to check.
	 * @returns A boolean indicating whether the feature should render a button.
	 */
	shouldRender?: (config: configuration[K]) => MaybePromise<boolean>;
};
export type FeatureDependencies = {
	/**
	 * List of pages that the feature is disabled on
	 */
	excludePages?: readonly PageType[];
	/**
	 * List of pages that the feature is enabled on
	 */
	includePages?: readonly PageType[];
};
export type FeatureKeys = {
	[K in configurationKeys]: ContainsEnabled<configuration[K]> extends true ? K : never;
}[configurationKeys];
export type FeatureKeysWithButtons = (typeof buttonNameToSettingName)[keyof typeof buttonNameToSettingName];
export type FeatureKeysWithState = {
	[K in keyof FeatureState]: FeatureKeyFromStateKey<K>;
}[keyof FeatureState];
export type FeatureMetadata<K extends FeatureKeys> =
	K extends FeatureKeysWithState ? FeatureMetadataWithState<Extract<K, FeatureKeysWithState>>
	:	FeatureMetadataWithoutState<Exclude<K, FeatureKeysWithState>>;
export type FeatureMetadataWithoutState<K extends FeatureKeys> = FeatureMetadataBase<K> & {
	/**
	 * Features without state do not require state schema input
	 * @remarks Not allowed when the feature does not have state
	 */
	stateSchemaInput?: never;
};
export type FeatureMetadataWithState<K extends FeatureKeysWithState> = FeatureMetadataBase<K> & {
	/**
	 * The shape of the state configuration input.
	 * @remarks This type is used to define the shape of the configuration input that is passed to the setState function.
	 * @remarks Required when the feature has state
	 */
	stateSchemaInput: ZodShapeExact<FeatureState[`state:${K}`]>;
};
export type FeatureSettingNode<F extends FeatureKeys> = DividerNode | GroupNode<F> | SettingNode<F> | TextNode;
export type FeatureSettingsSection<F extends FeatureKeys> = FeatureSettingNode<F>[];

export type FeatureState = {
	"state:maximizePlayerButton": PlayerControllerState;
	"state:miniPlayer": {
		manualOverride: boolean;
		rect: Nullable<MiniPlayerRect>;
	};
	"state:playerSpeed": { playbackSpeed: number };
	"state:rememberVolume": RememberedVolumes;
	"state:videoHistory": { storage: VideoHistoryStorage };
};

export type FeatureStateAPI<K extends FeatureKeysWithState> = {
	getState: () => FeatureState[`state:${K}`];
	setState: (updater: (prev: FeatureState[`state:${K}`]) => FeatureState[`state:${K}`]) => void;
};

export type FeatureStateKeys = {
	[K in keyof FeatureState]: K;
}[keyof FeatureState];

export type GroupNode<F extends FeatureKeys> = {
	attribution?: AttributionEntry[];
	children: FeatureSettingNode<F>[];
	section?: SettingsSectionId;
	type: "group";
};

export type NavigationType =
	| `history`
	| `home`
	| `library`
	| `playlist:${string}`
	| `shorts:${string}`
	| `subscriptions`
	| `watch:${string}`
	| (string & {});

export type NonFeatureKeys = Exclude<configurationKeys, CoreFeatureKeys | FeatureKeys>;

export type NumberSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "number";
	max: number;
	min: number;
	step: number;
};

export type ObjectSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "css-editor";
};

export const pageTypes = ["channel_home", "channel_videos", "home", "live", "playlist", "search", "shorts", "subscriptions", "watch"] as const;
export type PageType = (typeof pageTypes)[number];

export type PrefixedPath<K extends FeatureKeys> = K extends K ? `${K}.${Path<configuration[K]>}` : never;

export type SelectSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "select";
	options?: { label: TSelectFunc; value: PathValue<configuration, SettingId<F>> }[];
	optionsFrom?: () => { label: TSelectFunc; value: PathValue<configuration, SettingId<F>> }[];
};
export type SettingComponent<F extends FeatureKeys> = SettingNode<F>["component"];
export type SettingCondition<F extends FeatureKeys> = SettingConditionWithFeature | SettingConditionWithoutFeature<F>;

export type SettingConfig<F extends FeatureKeys> =
	| BooleanSettingConfig<F>
	| ColorPickerSettingConfig<F>
	| NumberSettingConfig<F>
	| ObjectSettingConfig<F>
	| SelectSettingConfig<F>
	| SliderSettingConfig<F>
	| TextInputSettingConfig<F>;
export type SettingId<F extends FeatureKeys> = PrefixedPath<F>;
export type SettingNode<F extends FeatureKeys> = SettingConfig<F>;

export type SettingsSectionId = keyof EnUS["settings"]["sections"];

export type SliderSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "slider";
	max: number;
	min: number;
	step: number;
};
export type TextInputSettingConfig<F extends FeatureKeys> = BaseSettingConfig<F> & {
	component: "text-input";
	input_type: "password" | "text";
};

export type TextNode = {
	content: TSelectFunc;
	type: "text";
};

type BaseSettingConfig<F extends FeatureKeys> = {
	alwaysVisible?: boolean;
	disabledReason?: TSelectFunc;
	disabledWhen?: SettingCondition<F>[];
	id: SettingId<F>;
	label: TSelectFunc;
	parentSetting?: DynamicParentSetting<F> | parentSetting;
	section?: SettingsSectionId;
	title: TSelectFunc;
	type?: never;
	visibleWhen?: SettingCondition<F>[];
};

type ConditionRule<K extends FeatureKeys, P extends PrefixedPath<K>> = {
	equals?: PathValue<configuration, P>;
	notEquals?: PathValue<configuration, P>;
	setting: P;
};

type ContainsEnabled<T> =
	// Direct enabled property
	T extends { enabled: boolean } ? true
	: // Single-button wrapper
	T extends { button: { enabled: boolean } } ? true
	: // Multi-button wrapper
	T extends { buttons: Record<string, { enabled: boolean }> } ? true
	: // Recurse into other objects
	T extends object ?
		{
			[K in keyof T]: ContainsEnabled<T[K]>;
		}[keyof T] extends true ?
			true
		:	false
	:	false;

type DynamicParentSetting<F extends configurationKeys> = (settings: configuration[F]) => Nullable<parentSetting>;
type FeatureKeyFromStateKey<K extends FeatureStateKeys> = K extends `state:${infer V}` ? V : never;
type FeatureMetadataBase<K extends FeatureKeys> = {
	/**
	 * Default values for the feature. These values are used to build the defaultConfig.
	 * @remarks These values must contain the enabled property.
	 */
	defaults: MustContainEnabled<configuration[K]>;
	/**
	 * Optional dependencies for the feature
	 */
	dependencies?: FeatureDependencies;
	/**
	 * Unique identifier for the feature
	 */
	id: K;
	/**
	 * Execution priority for the feature. Lower numbers execute first.
	 * @remarks Optional, defaults to 0 if not specified
	 */
	priority?: number;
	/**
	 * The shape of the configuration input.
	 * @remarks This means that the configuration input must have the exact same keys as the defaults.
	 */
	schemaInput: ZodShapeExact<MustContainEnabled<configuration[K]>>;
	/**
	 * Section title for the feature's settings
	 */
	sectionTitle?: TSelectFunc;
	/**
	 * Settings metadata for the feature's configuration UI
	 */
	settings: FeatureSettingsSection<NoInfer<K>>;
};

type FeatureWithoutStateBranch<K extends FeatureKeys> = {
	/**
	 * React to config changes
	 * @param config The configuration with the new values
	 * @returns A promise that resolves when the feature has handled the config change
	 */
	onConfigChange?: (config: configuration[K]) => MaybePromise<void>;
	/**
	 * Runs when the feature is disabled
	 * @param config The configuration with the new values
	 * @returns A promise that resolves when the feature has finished disabling
	 */
	onDisable?: (config: configuration[K]) => MaybePromise<void>;
	/**
	 * Runs when the feature is enabled
	 * @param config The configuration with the new values
	 * @returns A promise that resolves when the feature has finished enabling
	 */
	onEnable?: (config: configuration[K]) => MaybePromise<void>;
	/**
	 * Optional initialization that runs regardless of enabled state
	 * @param config The configuration with the initial values
	 * @returns A promise that resolves when the feature has finished initialization
	 */
	onInit?: (config: configuration[K]) => MaybePromise<void>;
	/**
	 * Optional navigation callback
	 * @param config The configuration with the new values
	 * @param navigationType The navigation signature/type (e.g., "watch:VIDEO_ID", "playlist:PLAYLIST_ID")
	 * @returns A promise that resolves when the feature has handled the navigation change
	 */
	onNavigate?: (config: configuration[K], navigationType: NavigationType) => MaybePromise<void>;
	state?: never;
};

type FeatureWithStateBranch<K extends FeatureKeysWithState> = {
	/**
	 * React to config changes
	 * @param config The configuration with the new values
	 * @param stateAPI The feature state API
	 * @returns A promise that resolves when the feature has handled the config change
	 */
	onConfigChange?: (config: configuration[K], stateAPI: FeatureStateAPI<K>) => MaybePromise<void>;
	/**
	 * Runs when the feature is disabled
	 * @param config The configuration with the new values
	 * @param stateAPI The feature state API
	 * @returns A promise that resolves when the feature has finished disabling
	 */
	onDisable?: (config: configuration[K], stateAPI: FeatureStateAPI<K>) => MaybePromise<void>;
	/**
	 * Runs when the feature is enabled
	 * @param config The configuration with the new values
	 * @param stateAPI The feature state API
	 * @returns A promise that resolves when the feature has finished enabling
	 */
	onEnable?: (config: configuration[K], stateAPI: FeatureStateAPI<K>) => MaybePromise<void>;
	/**
	 * Initialization hook that runs if the feature is enabled
	 * @param config The configuration with the initial values
	 * @param stateAPI The feature state API
	 * @returns A promise that resolves when the feature has finished initialization
	 */
	onInit?: (config: configuration[K], stateAPI: FeatureStateAPI<K>) => MaybePromise<void>;
	/**
	 * Optional navigation callback
	 * @param config The configuration with the new values
	 * @param stateAPI The feature state API
	 * @param navigationType The navigation signature/type (e.g., "watch:VIDEO_ID", "playlist:PLAYLIST_ID")
	 * @returns A promise that resolves when the feature has handled the navigation change
	 */
	onNavigate?: (config: configuration[K], stateAPI: FeatureStateAPI<K>, navigationType: NavigationType) => MaybePromise<void>;
	/**
	 * Whether state should be persisted to browser storage
	 * @default false
	 */
	persistState?: boolean;
	/**
	 * Internal feature state
	 * @remarks This is intended for runtime data like caches, history, or tracking (e.g. watched videos)
	 * It is not exposed to user config and should not be mutated via config update utilities.
	 */
	state: FeatureState[`state:${K}`];
};
type MustContainEnabled<T> = ContainsEnabled<T> extends true ? T : never;

type RuleSet<K extends FeatureKeys> = {
	[P in PrefixedPath<K>]: ConditionRule<K, PrefixedPath<K>>;
}[PrefixedPath<K>];
type SettingConditionWithFeature = {
	[K in FeatureKeys]: RuleSet<K> & {
		feature: K;
	};
}[FeatureKeys];
type SettingConditionWithoutFeature<K extends FeatureKeys> = RuleSet<K> & { feature?: never };

type ZodShapeExact<T extends object> = {
	[K in keyof T]: z.ZodMiniType<T[K]>;
};
export function isDividerNode(node: unknown): node is DividerNode {
	return hasType(node) && node.type === "divider";
}

export function isGroupNode<F extends FeatureKeys>(node: unknown): node is GroupNode<F> {
	return hasType(node) && node.type === "group";
}

export function isSettingNode<F extends FeatureKeys>(node: unknown): node is SettingNode<F> {
	return hasType(node) && node.type === undefined;
}
export function isTextNode(node: unknown): node is TextNode {
	return hasType(node) && node.type === "text";
}
function hasType(value: unknown): value is { type?: string } {
	return typeof value === "object" && value !== null && (!("type" in value) || typeof value.type === "string");
}
