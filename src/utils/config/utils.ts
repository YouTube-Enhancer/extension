import type { DeepDarkPreset } from "@/src/deepDarkPresets";
import type { FeatureMenuOpenType } from "@/src/features/featureMenu/types";
import type { MiniPlayerPosition, MiniPlayerSize } from "@/src/features/miniPlayer/types";
import type { VideoHistoryResumeType } from "@/src/features/videoHistory/types";
import type { VolumeBoostMode } from "@/src/features/volumeBoost/types";
import type { AvailableLocales } from "@/src/i18n/constants";
import type { ButtonPlacement, configuration, ParentType, Path, PathSegments, PathValue } from "@/src/types";
import type { OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType } from "@/src/ui/OnScreenDisplayManager/types";

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const { [key]: targetValue } = merged;
			const { [key]: sourceValue } = source;
			if (targetValue && typeof targetValue === "object") {
				merged[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
			} else {
				merged[key] = sourceValue;
			}
		}
	}

	return merged;
}

export function isLegacyConfiguration(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	const obj = config as Record<string, unknown>;
	for (const key in obj) {
		if (key.startsWith("enable_")) return true;
	}
	if (
		"osd_display_color" in obj ||
		"player_speed" in obj ||
		"volume_boost_amount" in obj ||
		"speed_adjustment_steps" in obj ||
		"volume_adjustment_steps" in obj
	) {
		return true;
	}
	return false;
}

export function migrateConfiguration(
	oldConfig: Record<string, unknown>,
	defaultConfiguration: configuration,
	rawStorage: Record<string, unknown> = {}
): configuration {
	const newConfig: configuration = structuredClone(defaultConfiguration);
	const oldPlacementMap =
		typeof oldConfig.button_placements === "object" && oldConfig.button_placements !== null ?
			(oldConfig.button_placements as Record<string, ButtonPlacement>)
		:	undefined;

	const enableKeyMap: Record<string, keyof configuration> = {
		enable_automatic_theater_mode: "automaticTheaterMode",
		enable_automatically_disable_ambient_mode: "automaticallyDisableAmbientMode",
		enable_automatically_disable_autoplay: "automaticallyDisableAutoPlay",
		enable_automatically_disable_closed_captions: "automaticallyDisableClosedCaptions",
		enable_automatically_enable_closed_captions: "automaticallyEnableClosedCaptions",
		enable_automatically_maximize_player: "automaticallyMaximizePlayer",
		enable_automatically_set_quality: "playerQuality",
		enable_automatically_show_more_videos_on_end_screen: "automaticallyShowMoreVideosOnEndScreen",
		enable_block_number_key_seeking: "blockNumberKeySeeking",
		enable_comments_mini_player: "miniPlayer",
		enable_comments_mini_player_button: "miniPlayerButton",
		enable_copy_timestamp_url_button: "copyTimestampUrlButton",
		enable_custom_css: "customCSS",
		enable_deep_dark_theme: "deepDarkCSS",
		enable_default_to_original_audio_track: "defaultToOriginalAudioTrack",
		enable_forced_playback_speed: "playerSpeed",
		enable_forward_rewind_buttons: "forwardRewindButtons",
		enable_global_volume: "globalVolume",
		enable_hide_artificial_intelligence_summary: "hideArtificialIntelligence",
		enable_hide_end_screen_cards: "hideEndScreenCards",
		enable_hide_end_screen_cards_button: "hideEndScreenCardsButton",
		enable_hide_live_stream_chat: "hideLiveStreamChat",
		enable_hide_members_only_videos: "hideMembersOnlyVideos",
		enable_hide_official_artist_videos_from_home_page: "hideOfficialArtistVideosFromHomePage",
		enable_hide_paid_promotion_banner: "hidePaidPromotionBanner",
		enable_hide_playables: "hidePlayables",
		enable_hide_playlist_recommendations_from_home_page: "hidePlaylistRecommendationsFromHomePage",
		enable_hide_scrollbar: "hideScrollBar",
		enable_hide_shorts: "hideShorts",
		enable_hide_sidebar_recommended_videos: "hideSidebarRecommendedVideos",
		enable_hide_translate_comment: "hideTranslateComment",
		enable_loop_button: "loopButton",
		enable_maximize_player_button: "maximizePlayerButton",
		enable_open_transcript_button: "openTranscriptButton",
		enable_open_youtube_settings_on_hover: "openYouTubeSettingsOnHover",
		enable_pausing_background_players: "pauseBackgroundPlayers",
		enable_playback_speed_buttons: "playbackSpeedButtons",
		enable_playlist_length: "playlistLength",
		enable_playlist_remove_button: "playlistManagementButtons",
		enable_playlist_reset_button: "playlistManagementButtons",
		enable_redirect_remover: "removeRedirect",
		enable_remaining_time: "remainingTime",
		enable_remember_last_volume: "rememberVolume",
		enable_restore_fullscreen_scrolling: "restoreFullscreenScrolling",
		enable_save_to_watch_later_button: "saveToWatchLaterButton",
		enable_screenshot_button: "screenshotButton",
		enable_scroll_wheel_speed_control: "scrollWheelSpeedControl",
		enable_scroll_wheel_volume_control: "scrollWheelVolumeControl",
		enable_scroll_wheel_volume_control_hold_modifier_key: "scrollWheelVolumeControl",
		enable_scroll_wheel_volume_control_hold_right_click: "scrollWheelVolumeControl",
		enable_share_shortener: "shareShortener",
		enable_shorts_auto_scroll: "shortsAutoScroll",
		enable_skip_continue_watching: "skipContinueWatching",
		enable_timestamp_peek: "timestampPeek",
		enable_video_history: "videoHistory",
		enable_volume_boost: "volumeBoost"
	};
	for (const [key, value] of Object.entries(oldConfig)) {
		if (key in enableKeyMap && typeof value === "boolean") {
			const { [key]: target } = enableKeyMap;
			const { [target]: targetValue } = newConfig;
			if (!targetValue || typeof targetValue !== "object") continue;
			if (target === "hideShorts") {
				for (const section of ["channel", "home", "search", "sidebar", "videos"] as const) {
					(
						targetValue as {
							channel: { enabled: boolean };
							home: { enabled: boolean };
							search: { enabled: boolean };
							sidebar: { enabled: boolean };
							videos: { enabled: boolean };
						}
					)[section].enabled = value;
				}
				continue;
			}
			switch (target) {
				case "playlistManagementButtons":
					if (typeof key === "string") {
						if (key.includes("remove")) newConfig.playlistManagementButtons.removeButton.enabled = value;
						if (key.includes("reset")) newConfig.playlistManagementButtons.resetButton.enabled = value;
						continue;
					}
					break;
				case "scrollWheelVolumeControl":
					if (typeof key === "string" && key.includes("hold_modifier_key")) {
						newConfig.scrollWheelVolumeControl.holdModifierKey = value;
					} else if (typeof key === "string" && key.includes("hold_right_click")) {
						newConfig.scrollWheelVolumeControl.holdRightClick = value;
					} else {
						newConfig.scrollWheelVolumeControl.enabled = value;
					}
					break;
				default: {
					if ("buttons" in targetValue && typeof targetValue.buttons === "object") {
						for (const [buttonKey, newButton] of Object.entries(targetValue.buttons)) {
							if (typeof newButton === "object" && newButton !== null && "enabled" in newButton && typeof newButton.enabled === "boolean") {
								newButton.enabled = value;
							}
							if (typeof newButton === "object" && newButton !== null && "placement" in newButton && oldPlacementMap?.[buttonKey]) {
								const { [buttonKey]: oldPlacement } = oldPlacementMap;
								newButton.placement = oldPlacement;
							}
						}
						break;
					}
					if ("button" in targetValue && typeof targetValue.button === "object") {
						const { button } = targetValue;
						if ("enabled" in button && typeof button.enabled === "boolean") {
							button.enabled = value;
						}
						if ("placement" in button && oldPlacementMap?.[target]) {
							const { [target]: oldPlacement } = oldPlacementMap;
							button.placement = oldPlacement;
						}
					}
					if ("enabled" in targetValue && typeof targetValue.enabled === "boolean") {
						targetValue.enabled = value;
					}
				}
			}
			continue;
		}
		switch (key) {
			case "custom_css_code":
				newConfig.customCSS.code = String(value);
				break;
			case "deep_dark_custom_theme_colors":
				newConfig.deepDarkCSS.colors = value as typeof newConfig.deepDarkCSS.colors;
				break;
			case "deep_dark_preset":
				newConfig.deepDarkCSS.preset = value as DeepDarkPreset;
				break;
			case "feature_menu_open_type":
				newConfig.featureMenu.openType = value as FeatureMenuOpenType;
				break;
			case "forward_rewind_buttons_time":
				newConfig.forwardRewindButtons.time = Number(value);
				break;
			case "global_volume":
				newConfig.globalVolume.volume = Number(value);
				break;
			case "language":
				newConfig.language = value as AvailableLocales;
				break;
			case "mini_player_default_position":
				newConfig.miniPlayer.defaultPosition = value as MiniPlayerPosition;
				break;
			case "mini_player_default_size":
				newConfig.miniPlayer.defaultSize = value as MiniPlayerSize;
				break;
			case "osd_display_color":
				newConfig.onScreenDisplay.color = value as OnScreenDisplayColor;
				break;
			case "osd_display_hide_time":
				newConfig.onScreenDisplay.hideTime = Number(value);
				break;
			case "osd_display_opacity":
				newConfig.onScreenDisplay.opacity = Number(value);
				break;
			case "osd_display_padding":
				newConfig.onScreenDisplay.padding = Number(value);
				break;
			case "osd_display_position":
				newConfig.onScreenDisplay.position = value as OnScreenDisplayPosition;
				break;
			case "osd_display_type":
				newConfig.onScreenDisplay.type = value as OnScreenDisplayType;
				break;
			case "player_quality":
				newConfig.playerQuality.quality = value as typeof newConfig.playerQuality.quality;
				break;
			case "player_quality_fallback_strategy":
				newConfig.playerQuality.fallbackStrategy = value as typeof newConfig.playerQuality.fallbackStrategy;
				break;
			case "player_speed":
				newConfig.playerSpeed.speed = Number(value);
				break;
			case "playlist_length_get_method":
				newConfig.playlistLength.lengthGetMethod = value as typeof newConfig.playlistLength.lengthGetMethod;
				break;
			case "playlist_watch_time_get_method":
				newConfig.playlistLength.watchTimeGetMethod = value as typeof newConfig.playlistLength.watchTimeGetMethod;
				break;
			case "rememberedVolumes":
				if (typeof value === "object" && value !== null) {
					const volumes = value as Record<string, unknown>;
					rawStorage["state:rememberVolume"] = {
						shortsPageVolume: typeof volumes.shortsPageVolume === "number" ? volumes.shortsPageVolume : 25,
						watchPageVolume: typeof volumes.watchPageVolume === "number" ? volumes.watchPageVolume : 25
					};
				}
				break;
			case "screenshot_format":
				newConfig.screenshotButton.format = value as typeof newConfig.screenshotButton.format;
				break;
			case "screenshot_save_as":
				newConfig.screenshotButton.saveAs = value as typeof newConfig.screenshotButton.saveAs;
				break;
			case "scroll_wheel_speed_control_modifier_key":
				newConfig.scrollWheelSpeedControl.modifierKey = value as typeof newConfig.scrollWheelSpeedControl.modifierKey;
				break;
			case "scroll_wheel_volume_control_hold_modifier_key":
				newConfig.scrollWheelVolumeControl.holdModifierKey = Boolean(value);
				break;
			case "scroll_wheel_volume_control_hold_right_click":
				newConfig.scrollWheelVolumeControl.holdRightClick = Boolean(value);
				break;
			case "scroll_wheel_volume_control_modifier_key":
				newConfig.scrollWheelVolumeControl.modifierKey = value as typeof newConfig.scrollWheelVolumeControl.modifierKey;
				break;
			case "speed_adjustment_steps":
				newConfig.scrollWheelSpeedControl.steps = Number(value);
				break;
			case "video_history_resume_type":
				newConfig.videoHistory.resumeType = value as VideoHistoryResumeType;
				break;
			case "volume_adjustment_steps":
				newConfig.scrollWheelVolumeControl.steps = Number(value);
				break;
			case "volume_boost_amount":
				newConfig.volumeBoost.amount = Number(value);
				break;
			case "volume_boost_mode":
				newConfig.volumeBoost.mode = value as VolumeBoostMode;
				break;
			case "youtube_data_api_v3_key":
				newConfig.youtubeDataApiV3Key = String(value);
				break;
		}
	}
	return newConfig;
}

export function parseStoredValue(value: string) {
	try {
		// Attempt to parse the value as JSON
		const parsedValue = JSON.parse(value);
		// Check if the parsed value is a boolean or a number
		if (typeof parsedValue === "boolean" || typeof parsedValue === "number" || typeof parsedValue === "object") {
			return parsedValue; // Return the parsed value
		}
	} catch {}
	// If parsing or type checking fails, return the original value as a string
	return value;
}

export function updateConfigAtPath<P extends Path<configuration>>(
	state: configuration,
	key: P,
	nextValue: PathValue<configuration, P>
): configuration {
	type Segments = PathSegments<P>;
	type Parent = ParentType<configuration, Segments>;
	const keys = key.split(".") as unknown as Segments;
	console.log("[DEBUG-BP] updateConfigAtPath", { keys });
	const updatedState = structuredClone(state);
	let parent: Parent = updatedState as Parent;
	for (const k of keys.slice(0, -1)) {
		if (typeof parent !== "object" || parent === null || !(k in parent)) {
			console.log("[DEBUG-BP] path FAIL at segment:", k);
			return state;
		}
		parent = parent[k as keyof Parent] as Parent;
	}
	const lastKey = keys.at(-1);
	if (!lastKey || typeof parent !== "object" || parent === null) {
		return state;
	}
	parent[lastKey as keyof Parent] = nextValue as Parent[keyof Parent];
	return updatedState;
}
