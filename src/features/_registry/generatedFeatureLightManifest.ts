// GENERATED FILE — do not edit by hand.
// Source of truth: each feature's index.metadata.ts
// Regenerate: pnpm run lint:manifest -- --write (or pnpm run build:pre)
// Check: pnpm run lint:manifest (also runs in lint, typecheck, and pre-commit)

import type { FeatureKeys } from "@/src/features/_registry/types";

export type FeatureLightManifest = {
	defaults: Partial<Record<FeatureKeys, unknown>>;
	featureIds: readonly FeatureKeys[];
	stateFeatureIds: readonly FeatureKeys[];
};

export const featureLightManifest = {
	defaults: {
		automaticallyDisableAmbientMode: {
			enabled: false
		},
		automaticallyDisableAutoPlay: {
			enabled: false
		},
		automaticallyDisableClosedCaptions: {
			enabled: false
		},
		automaticallyEnableClosedCaptions: {
			enabled: false
		},
		automaticallyMaximizePlayer: {
			enabled: false
		},
		automaticallyShowMoreVideosOnEndScreen: {
			enabled: false
		},
		automaticTheaterMode: {
			enabled: false
		},
		blockNumberKeySeeking: {
			enabled: false
		},
		copyTimestampUrlButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_right"
			}
		},
		customCSS: {
			code: "",
			enabled: false
		},
		customFontFamily: {
			enabled: false,
			fontFamily: "Arial, sans-serif"
		},
		deepDarkCSS: {
			colors: {
				colorShadow: "#383c4a4d",
				dimmerText: "#cccccc",
				hoverBackground: "#4e5467",
				mainBackground: "#22242d",
				mainColor: "#367bf0",
				mainText: "#eeeeee",
				secondBackground: "#242730"
			},
			enabled: false,
			preset: "Deep-Dark"
		},
		defaultToOriginalAudioTrack: {
			enabled: false
		},
		flipVideoButtons: {
			buttons: {
				flipVideoHorizontalButton: {
					enabled: false,
					fullscreenPlacement: "same",
					placement: "player_controls_right"
				},
				flipVideoVerticalButton: {
					enabled: false,
					fullscreenPlacement: "same",
					placement: "player_controls_right"
				}
			}
		},
		forwardRewindButtons: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_right"
			},
			time: 5
		},
		globalVolume: {
			enabled: false,
			volume: 25
		},
		hideArtificialIntelligence: {
			enabled: false
		},
		hideAutoplayButton: {
			enabled: false
		},
		hideEndScreenCards: {
			enabled: false
		},
		hideEndScreenCardsButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_right"
			}
		},
		hideEndscreenRecommendedVideos: {
			enabled: false
		},
		hideFullscreenButton: {
			enabled: false
		},
		hideLiveStreamChat: {
			enabled: false
		},
		hideMembersOnlyVideos: {
			enabled: false
		},
		hideNextButton: {
			enabled: false
		},
		hideOfficialArtistVideosFromHomePage: {
			enabled: false
		},
		hidePaidPromotionBanner: {
			enabled: false
		},
		hidePlayables: {
			enabled: false
		},
		hidePlaylistRecommendations: {
			enabled: false
		},
		hidePlaylistRecommendationsFromHomePage: {
			enabled: false
		},
		hidePosts: {
			enabled: false
		},
		hideScrollBar: {
			enabled: false
		},
		hideShorts: {
			channel: {
				enabled: false
			},
			home: {
				enabled: false
			},
			search: {
				enabled: false
			},
			sidebar: {
				enabled: false
			},
			subscriptions: {
				enabled: false
			},
			videos: {
				enabled: false
			}
		},
		hideSidebarRecommendedVideos: {
			enabled: false
		},
		hideTranslateComment: {
			enabled: false
		},
		hideVideoDuration: {
			enabled: false
		},
		keywordBlocklist: {
			enabled: false,
			keywords: ""
		},
		loopButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "feature_menu"
			}
		},
		maximizePlayerButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "feature_menu"
			}
		},
		miniPlayer: {
			defaultPosition: "bottom_right",
			defaultSize: "400x225",
			enabled: false
		},
		miniPlayerButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "player_controls_right",
				placement: "below_player"
			}
		},
		monoToStereoButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_left"
			}
		},
		openTranscriptButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "feature_menu"
			}
		},
		openYouTubeSettingsOnHover: {
			enabled: false
		},
		pauseBackgroundPlayers: {
			enabled: false
		},
		playbackSpeedButtons: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_left"
			},
			speed: 0.25
		},
		playerQuality: {
			enabled: false,
			fallbackStrategy: "lower",
			fpsPreference: "default",
			preferPremium: false,
			quality: "hd1080"
		},
		playerSpeed: {
			channelSpeeds: "",
			enabled: false,
			speed: 1
		},
		playlistLength: {
			enabled: false,
			lengthGetMethod: "api",
			watchTimeGetMethod: "youtube"
		},
		playlistManagementButtons: {
			removeAllButton: {
				enabled: false
			},
			removeButton: {
				enabled: false
			},
			resetButton: {
				enabled: false
			}
		},
		playlistReverseButton: {
			enabled: false
		},
		remainingTime: {
			enabled: false
		},
		rememberVolume: {
			enabled: false
		},
		removeRedirect: {
			enabled: false
		},
		restoreFullscreenScrolling: {
			enabled: false
		},
		saveToWatchLaterButton: {
			enabled: false
		},
		screenshotButton: {
			button: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_left"
			},
			dateFormat: "iso",
			filename: "Screenshot-{video id}-{date}",
			format: "png",
			saveAs: "file",
			timestampFormat: "auto",
			timestampSeparator: "auto"
		},
		scrollWheelSpeedControl: {
			enabled: false,
			modifierKey: "altKey",
			steps: 0.25
		},
		scrollWheelVolumeControl: {
			enabled: false,
			holdModifierKey: false,
			holdRightClick: false,
			modifierKey: "ctrlKey",
			steps: 5
		},
		shareShortener: {
			enabled: false
		},
		sharpCorners: {
			enabled: false
		},
		shortsAutoScroll: {
			enabled: false
		},
		skipContinueWatching: {
			enabled: false
		},
		timestampPeek: {
			enabled: false
		},
		videoHistory: {
			enabled: false,
			resumeType: "prompt"
		},
		videosPerRow: {
			enabled: false,
			videosPerRow: 4
		},
		volumeBoost: {
			amount: 5,
			button: {
				fullscreenPlacement: "same",
				placement: "player_controls_left"
			},
			enabled: false,
			mode: "global"
		}
	} as Partial<Record<FeatureKeys, unknown>>,
	featureIds: [
		"automaticTheaterMode",
		"automaticallyDisableAmbientMode",
		"automaticallyDisableAutoPlay",
		"automaticallyDisableClosedCaptions",
		"automaticallyEnableClosedCaptions",
		"automaticallyMaximizePlayer",
		"automaticallyShowMoreVideosOnEndScreen",
		"blockNumberKeySeeking",
		"copyTimestampUrlButton",
		"customCSS",
		"customFontFamily",
		"deepDarkCSS",
		"defaultToOriginalAudioTrack",
		"flipVideoButtons",
		"forwardRewindButtons",
		"globalVolume",
		"hideArtificialIntelligence",
		"hideAutoplayButton",
		"hideEndScreenCards",
		"hideEndScreenCardsButton",
		"hideEndscreenRecommendedVideos",
		"hideFullscreenButton",
		"hideLiveStreamChat",
		"hideMembersOnlyVideos",
		"hideNextButton",
		"hideOfficialArtistVideosFromHomePage",
		"hidePaidPromotionBanner",
		"hidePlayables",
		"hidePlaylistRecommendations",
		"hidePlaylistRecommendationsFromHomePage",
		"hidePosts",
		"hideScrollBar",
		"hideShorts",
		"hideSidebarRecommendedVideos",
		"hideTranslateComment",
		"hideVideoDuration",
		"keywordBlocklist",
		"loopButton",
		"maximizePlayerButton",
		"miniPlayer",
		"miniPlayerButton",
		"monoToStereoButton",
		"openTranscriptButton",
		"openYouTubeSettingsOnHover",
		"pauseBackgroundPlayers",
		"playbackSpeedButtons",
		"playerQuality",
		"playerSpeed",
		"playlistLength",
		"playlistManagementButtons",
		"playlistReverseButton",
		"remainingTime",
		"rememberVolume",
		"removeRedirect",
		"restoreFullscreenScrolling",
		"saveToWatchLaterButton",
		"screenshotButton",
		"scrollWheelSpeedControl",
		"scrollWheelVolumeControl",
		"shareShortener",
		"sharpCorners",
		"shortsAutoScroll",
		"skipContinueWatching",
		"timestampPeek",
		"videoHistory",
		"videosPerRow",
		"volumeBoost"
	],
	stateFeatureIds: [
		"maximizePlayerButton",
		"miniPlayer",
		"playerSpeed",
		"playlistReverseButton",
		"rememberVolume",
		"videoHistory"
	]
} as const satisfies FeatureLightManifest;

export const {
	defaults: featureLightDefaults,
	featureIds: featureLightFeatureIds,
	stateFeatureIds: featureLightStateFeatureIds
} = featureLightManifest;
