/* eslint-disable perfectionist/sort-modules */
import type EnUS from "public/locales/en-US.json";

// -------------------------
// Core primitives
// -------------------------
type Text = string;
type StringMap = Record<string, Text>;

type Recursive<T> = {
	[key: string]: Recursive<T> | T;
};

// -------------------------
// Buttons & Toggles
// -------------------------
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

// -------------------------
// Feature Strings
// -------------------------
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

// -------------------------
// Pages Content
// -------------------------
export type PagesContentStrings = {
	features: Record<string, FeatureStrings>;
};

// -------------------------
// Pages Options / Notifications
// -------------------------
export type OptionsNotificationLevel = "error" | "info" | "success";

export type OptionNotificationStrings = {
	[level in OptionsNotificationLevel]?: Recursive<Text>;
};

export type PagesOptionsStrings = {
	extras?: Recursive<Text>;
	notifications?: OptionNotificationStrings;
};

// -------------------------
// Pages
// -------------------------
export type PagesStrings = {
	content: PagesContentStrings;
	options: PagesOptionsStrings;
};

// -------------------------
// Settings
// -------------------------
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
export type OldTranslationStruct = {
	langCode: string;
	langName: string;
	messages: {
		resumingVideo: string;
		settingVolume: string;
	};
	pages: {
		content: {
			features: {
				copyTimestampUrlButton: { button: { copied: string; label: string } };
				featureMenu: { button: { label: string } };
				forwardRewindButtons: {
					buttons: {
						forwardButton: { label: string };
						rewindButton: { label: string };
					};
				};
				hideEndScreenCardsButton: {
					button: {
						label: string;
						toggle: { off: string; on: string };
					};
				};
				loopButton: {
					button: {
						label: string;
						toggle: {
							off: string;
							on: string;
						};
					};
				};
				maximizePlayerButton: {
					button: {
						label: string;
						toggle: {
							off: string;
							on: string;
						};
					};
				};
				openTranscriptButton: { button: { label: string } };
				playbackSpeedButtons: {
					buttons: {
						decreasePlaybackSpeedButton: { label: string };
						increasePlaybackSpeedButton: { label: string };
					};
					decreaseLimit: string;
					increaseLimit: string;
				};
				playlistLength: {
					title: string;
				};
				screenshotButton: {
					button: { label: string };
					copiedToClipboard: string;
				};
				videoHistory: {
					resumeButton: string;
					resumePrompt: { close: string };
				};
				volumeBoostButton: {
					button: {
						label: string;
						toggle: {
							off: string;
							on: string;
						};
					};
				};
			};
		};
		options: {
			notifications: {
				error: {
					optionConflict: string;
					scrollWheelHoldModifierKey: {
						sameKey: {
							speedControl: string;
							volumeControl: string;
						};
					};
				};
				info: {
					reset: string;
				};
				success: { saved: string };
			};
		};
	};
	settings: {
		clearData: {
			allDataDeleted: string;
			confirmAlert: string;
		};
		optionDisabled: {
			either: {
				label: string;
				separator: string;
			};
			plural: {
				label: string;
				separator: string;
			};
			singular: string;
			specificOption: {
				featureMenu: string;
				screenshotButtonFileFormat: string;
			};
		};
		scrollForMoreSettings: string;
		sections: {
			automaticQuality: {
				enable: {
					label: string;
					title: string;
				};
				fallbackQualityStrategy: {
					select: {
						label: string;
						options: {
							higher: string;
							lower: string;
						};
						title: string;
					};
				};
				select: {
					label: string;
					title: string;
				};
				title: string;
			};
			bottomButtons: {
				clear: {
					title: string;
					value: string;
				};
				confirm: {
					title: string;
					value: string;
				};
				openTab: { title: string };
				reset: {
					title: string;
					value: string;
				};
			};
			buttonPlacement: {
				select: {
					buttonNames: {
						copyTimestampUrlButton: string;
						decreasePlaybackSpeedButton: string;
						forwardButton: string;
						hideEndScreenCardsButton: string;
						increasePlaybackSpeedButton: string;
						loopButton: string;
						maximizePlayerButton: string;
						openTranscriptButton: string;
						rewindButton: string;
						screenshotButton: string;
						volumeBoostButton: string;
					};
					options: {
						below_player: {
							placement: string;
							value: string;
						};
						feature_menu: {
							placement: string;
							value: string;
						};
						player_controls_left: {
							placement: string;
							value: string;
						};
						player_controls_right: {
							placement: string;
							value: string;
						};
					};
					title: string;
				};
				title: string;
			};
			customCSS: {
				editor: {
					collapse: string;
					expand: string;
					noProblems: string;
				};
				enable: {
					label: string;
					title: string;
				};
				title: string;
			};
			featureMenu: {
				openType: {
					select: {
						label: string;
						options: {
							click: string;
							hover: string;
						};
						title: string;
					};
					title: string;
				};
			};
			forwardRewindButtons: {
				enable: {
					label: string;
					title: string;
				};
				time: {
					label: string;
					title: string;
				};
				title: string;
			};
			importExportSettings: {
				exportButton: {
					success: string;
					title: string;
					value: string;
				};
				importButton: {
					error: {
						unknown: string;
						validation: string;
					};
					success: string;
					title: string;
					value: string;
				};
			};
			language: {
				select: {
					label: string;
					title: string;
				};
				title: string;
			};
			miscellaneous: {
				features: {
					automaticallyDisableAmbientMode: {
						label: string;
						title: string;
					};
					automaticallyDisableAutoPlay: {
						label: string;
						title: string;
					};
					automaticallyDisableClosedCaptions: {
						label: string;
						title: string;
					};
					automaticallyEnableClosedCaptions: {
						label: string;
						title: string;
					};
					automaticallyMaximizePlayer: {
						label: string;
						title: string;
					};
					automaticallyShowMoreVideosOnEndScreen: {
						label: string;
						title: string;
					};
					automaticTheaterMode: {
						label: string;
						title: string;
					};
					copyTimestampUrlButton: {
						label: string;
						title: string;
					};
					defaultToOriginalAudioTrack: {
						label: string;
						title: string;
					};
					enableMarkAsUnwatchedButton: {
						label: string;
						title: string;
					};
					enableRemoveVideoButton: {
						label: string;
						title: string;
					};
					enableSaveToWatchLaterButton: {
						label: string;
						title: string;
					};
					hideArtificialIntelligenceSummary: {
						label: string;
						title: string;
					};
					hideEndScreenCards: {
						label: string;
						title: string;
					};
					hideEndScreenCardsButton: {
						label: string;
						title: string;
					};
					hideLiveStreamChat: {
						label: string;
						title: string;
					};
					hideMembersOnlyVideos: {
						label: string;
						title: string;
					};
					hideOfficialArtistVideosFromHomePage: {
						label: string;
						title: string;
					};
					hidePaidPromotionBanner: {
						label: string;
						title: string;
					};
					hidePlayables: {
						label: string;
						title: string;
					};
					hidePlaylistRecommendationsFromHomePage: {
						label: string;
						title: string;
					};
					hideScrollbar: {
						label: string;
						title: string;
					};
					hideShorts: {
						label: string;
						title: string;
					};
					hideSidebarRecommendedVideos: {
						label: string;
						title: string;
					};
					hideTranslateComment: {
						label: string;
						title: string;
					};
					loopButton: {
						label: string;
						title: string;
					};
					maximizePlayerButton: {
						label: string;
						title: string;
					};
					openTranscriptButton: {
						label: string;
						title: string;
					};
					openYouTubeSettingsOnHover: {
						label: string;
						title: string;
					};
					pauseBackgroundPlayers: {
						label: string;
						title: string;
					};
					remainingTime: {
						label: string;
						title: string;
					};
					rememberLastVolume: {
						label: string;
						title: string;
					};
					removeRedirect: {
						label: string;
						title: string;
					};
					restoreFullscreenScrolling: {
						label: string;
						title: string;
					};
					shareShortener: {
						label: string;
						title: string;
					};
					shortsAutoScroll: {
						label: string;
						title: string;
					};
					skipContinueWatching: {
						label: string;
						title: string;
					};
				};
				title: string;
			};
			onScreenDisplaySettings: {
				color: {
					label: string;
					options: {
						blue: string;
						green: string;
						orange: string;
						pink: string;
						purple: string;
						red: string;
						white: string;
						yellow: string;
					};
					title: string;
				};
				hide: {
					label: string;
					title: string;
				};
				opacity: {
					label: string;
					title: string;
				};
				padding: {
					label: string;
					title: string;
				};
				position: {
					label: string;
					options: {
						bottom_left: string;
						bottom_right: string;
						center: string;
						top_left: string;
						top_right: string;
					};
					title: string;
				};
				title: string;
				type: {
					label: string;
					options: {
						circle: string;
						line: string;
						no_display: string;
						text: string;
					};
					title: string;
				};
			};
			playbackSpeed: {
				enable: {
					label: string;
					title: string;
				};
				playbackSpeedButtons: {
					label: string;
					select: {
						label: string;
						title: string;
					};
					title: string;
				};
				select: {
					label: string;
					title: string;
				};
				title: string;
			};
			playlistLength: {
				enable: {
					label: string;
					title: string;
				};
				title: string;
				wayToGetLength: {
					select: {
						label: string;
						title: string;
					};
				};
				wayToGetWatchTime: {
					select: {
						label: string;
						options: {
							duration: string;
							youtube: string;
						};
						title: string;
					};
				};
			};
			playlistManagement: {
				features: {
					markAsUnwatchedButton: {
						label: string;
						title: string;
					};
					removeVideoButton: {
						label: string;
						title: string;
					};
				};
				title: string;
			};
			playlistManagementButtons: {
				failedToMarkAsUnwatched: string;
				failedToRemoveVideo: string;
				markAsUnwatched: string;
				markingAsUnwatched: string;
				removeVideo: string;
				removingVideo: string;
			};
			saveToWatchLaterButton: {
				failedToSaveVideo: string;
				saveVideo: string;
				savingVideo: string;
			};
			screenshotButton: {
				enable: {
					label: string;
					title: string;
				};
				saveAs: {
					both: string;
					clipboard: string;
					file: string;
				};
				selectFormat: {
					label: string;
					title: string;
				};
				selectSaveAs: {
					label: string;
					title: string;
				};
				title: string;
			};
			scrollWheelSpeedControl: {
				adjustmentSteps: {
					label: string;
					title: string;
				};
				enable: {
					label: string;
					title: string;
				};
				optionLabel: string;
				select: {
					label: string;
					title: string;
				};
				title: string;
			};
			scrollWheelVolumeControl: {
				adjustmentSteps: {
					label: string;
					title: string;
				};
				enable: {
					label: string;
					title: string;
				};
				holdModifierKey: {
					enable: {
						label: string;
						title: string;
					};
					optionLabel: string;
					select: {
						label: string;
						title: string;
					};
				};
				holdRightClick: {
					enable: {
						label: string;
						title: string;
					};
				};
				title: string;
			};
			settingSearch: { placeholder: string };
			videoHistory: {
				enable: {
					label: string;
					title: string;
				};
				resumeType: {
					select: {
						label: string;
						options: {
							automatic: string;
							prompt: string;
						};
						title: string;
					};
				};
				title: string;
			};
			volumeBoost: {
				boostAmount: {
					label: string;
					title: string;
				};
				enable: {
					label: string;
					title: string;
				};
				mode: {
					select: {
						label: string;
						options: {
							global: string;
							perVideo: string;
						};
						title: string;
					};
				};
				title: string;
			};
			youtubeDataApiV3Key: {
				getApiKeyLinkText: string;
				input: {
					label: string;
					title: string;
				};
				title: string;
			};
			youtubeDeepDark: {
				author: string;
				"co-authors": string;
				colors: {
					colorShadow: {
						label: string;
						title: string;
					};
					dimmerText: {
						label: string;
						title: string;
					};
					hoverBackground: {
						label: string;
						title: string;
					};
					mainBackground: {
						label: string;
						title: string;
					};
					mainColor: {
						label: string;
						title: string;
					};
					mainText: {
						label: string;
						title: string;
					};
					secondBackground: {
						label: string;
						title: string;
					};
				};
				enable: {
					label: string;
					title: string;
				};
				select: {
					label: string;
					title: string;
				};
				title: string;
			};
		};
	};
};
export type NewTranslationStruct = {
	langCode: string;
	langName: string;
	messages: {
		resumingVideo: string;
		settingVolume: string;
	};
	pages: {
		content: {
			features: {
				copyTimestampUrlButton: { button: { label: string }; extras: { copied: string } };
				featureMenu: { button: { label: string } };
				forwardRewindButtons: {
					buttons: {
						forwardButton: { label: string };
						rewindButton: { label: string };
					};
				};
				hideEndScreenCardsButton: {
					button: {
						label: string;
						toggle: { off: string; on: string };
					};
				};
				loopButton: { button: { label: string; toggle: { off: string; on: string } } };
				maximizePlayerButton: { button: { label: string; toggle: { off: string; on: string } } };
				openTranscriptButton: { button: { label: string } };
				playbackSpeedButtons: {
					buttons: {
						decreasePlaybackSpeedButton: { label: string };
						increasePlaybackSpeedButton: { label: string };
					};
					extras: {
						decreaseLimit: string;
						increaseLimit: string;
					};
				};
				playlistLength: {
					title: string;
				};
				playlistManagementButtons: {
					extras: {
						failedToMarkAsUnwatched: string;
						failedToRemoveVideo: string;
						markAsUnwatched: string;
						markingAsUnwatched: string;
						removeVideo: string;
						removingVideo: string;
					};
				};
				saveToWatchLaterButton: {
					extras: {
						failedToSaveVideo: string;
						saveVideo: string;
						savingVideo: string;
					};
				};
				screenshotButton: {
					button: { label: string };
					extras: { copiedToClipboard: string };
				};
				videoHistory: { extras: { resumeButton: string; resumePromptClose: string } };
				volumeBoostButton: {
					button: {
						label: string;
						toggle: { off: string; on: string };
					};
				};
			};
		};
		options: {
			extras: {
				bottomButtons: {
					clear: {
						title: string;
						value: string;
					};
					confirm: { title: string; value: string };
					openTab: { title: string };
					reset: {
						title: string;
						value: string;
					};
				};
				buttonPlacement: {
					select: {
						buttonNames: {
							copyTimestampUrlButton: string;
							decreasePlaybackSpeedButton: string;
							forwardButton: string;
							hideEndScreenCardsButton: string;
							increasePlaybackSpeedButton: string;
							loopButton: string;
							maximizePlayerButton: string;
							openTranscriptButton: string;
							rewindButton: string;
							screenshotButton: string;
							volumeBoostButton: string;
						};
						options: {
							below_player: { placement: string; value: string };
							feature_menu: { placement: string; value: string };
							player_controls_left: { placement: string; value: string };
							player_controls_right: { placement: string; value: string };
						};
						title: string;
					};
					title: string;
				};
				clearData: {
					allDataDeleted: string;
					confirmAlert: string;
				};
				featureMenu: {
					openType: {
						select: {
							label: string;
							options: { click: string; hover: string };
							title: string;
						};
						title: string;
					};
				};
				importExportSettings: {
					exportButton: {
						success: string;
						title: string;
						value: string;
					};
					importButton: {
						error: {
							unknown: string;
							validation: string;
						};
						success: string;
						title: string;
						value: string;
					};
				};
				language: {
					select: { label: string; title: string };
					title: string;
				};
				optionDisabled: {
					either: { label: string; separator: string };
					plural: { label: string; separator: string };
					singular: string;
					specificOption: {
						featureMenu: string;
						screenshotButtonFileFormat: string;
					};
				};
				scrollForMoreSettings: string;
				settingSearch: { placeholder: string };
				youtubeDataApiV3Key: {
					getApiKeyLinkText: string;
					input: { label: string; title: string };
					title: string;
				};
			};
			notifications: {
				error: {
					optionConflict: string;
					scrollWheelHoldModifierKey: {
						sameKey: {
							speedControl: string;
							volumeControl: string;
						};
					};
				};
				info: {
					reset: string;
				};
				success: { saved: string };
			};
		};
	};
	settings: {
		sections: {
			customCSS: {
				enable: { label: string; title: string };
				extras: {
					collapse: string;
					expand: string;
					noProblems: string;
				};
				title: string;
			};
			deepDarkCSS: {
				enable: { label: string; title: string };
				extras: { author: string; "co-authors": string };
				settings: {
					colorShadow: { label: string; title: string };
					dimmerText: { label: string; title: string };
					hoverBackground: { label: string; title: string };
					mainBackground: { label: string; title: string };
					mainColor: { label: string; title: string };
					mainText: { label: string; title: string };
					secondBackground: { label: string; title: string };
					theme: {
						select: { label: string; title: string };
					};
				};
				title: string;
			};
			forwardRewindButtons: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					time: {
						label: string;
						title: string;
					};
				};
				title: string;
			};
			miscellaneous: {
				settings: {
					automaticallyDisableAmbientMode: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticallyDisableAutoPlay: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticallyDisableClosedCaptions: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticallyEnableClosedCaptions: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticallyMaximizePlayer: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticallyShowMoreVideosOnEndScreen: {
						enable: {
							label: string;
							title: string;
						};
					};
					automaticTheaterMode: {
						enable: {
							label: string;
							title: string;
						};
					};
					copyTimestampUrlButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					defaultToOriginalAudioTrack: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideArtificialIntelligenceSummary: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideEndScreenCards: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideEndScreenCardsButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideLiveStreamChat: { enable: { label: string; title: string } };
					hideMembersOnlyVideos: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideOfficialArtistVideosFromHomePage: {
						enable: {
							label: string;
							title: string;
						};
					};
					hidePaidPromotionBanner: {
						enable: {
							label: string;
							title: string;
						};
					};
					hidePlayables: { enable: { label: string; title: string } };
					hidePlaylistRecommendationsFromHomePage: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideScrollbar: { enable: { label: string; title: string } };
					hideShorts: { enable: { label: string; title: string } };
					hideSidebarRecommendedVideos: {
						enable: {
							label: string;
							title: string;
						};
					};
					hideTranslateComment: {
						enable: {
							label: string;
							title: string;
						};
					};
					loopButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					maximizePlayerButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					openTranscriptButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					openYouTubeSettingsOnHover: {
						enable: {
							label: string;
							title: string;
						};
					};
					pauseBackgroundPlayers: {
						enable: {
							label: string;
							title: string;
						};
					};
					remainingTime: {
						enable: {
							label: string;
							title: string;
						};
					};
					rememberVolume: {
						enable: {
							label: string;
							title: string;
						};
					};
					removeRedirect: {
						enable: {
							label: string;
							title: string;
						};
					};
					restoreFullscreenScrolling: {
						enable: {
							label: string;
							title: string;
						};
					};
					saveToWatchLaterButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					shareShortener: {
						enable: {
							label: string;
							title: string;
						};
					};
					shortsAutoScroll: {
						enable: { label: string; title: string };
					};
					skipContinueWatching: {
						enable: {
							label: string;
							title: string;
						};
					};
				};
				title: string;
			};
			onScreenDisplaySettings: {
				settings: {
					color: {
						label: string;
						select: {
							options: {
								blue: string;
								green: string;
								orange: string;
								pink: string;
								purple: string;
								red: string;
								white: string;
								yellow: string;
							};
						};
						title: string;
					};
					hide: {
						label: string;
						title: string;
					};
					opacity: { label: string; title: string };
					padding: {
						label: string;
						title: string;
					};
					position: {
						label: string;
						select: {
							options: {
								bottom_left: string;
								bottom_right: string;
								center: string;
								top_left: string;
								top_right: string;
							};
						};
						title: string;
					};
					type: {
						label: string;
						select: {
							options: { circle: string; line: string; no_display: string; text: string };
						};
						title: string;
					};
				};
				title: string;
			};
			playerQuality: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					quality: { select: { label: string; title: string } };
					qualityFallbackStrategy: {
						select: {
							label: string;
							options: { higher: string; lower: string };
							title: string;
						};
					};
				};
				title: string;
			};
			playerSpeed: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					buttons: {
						label: string;
						select: {
							label: string;
							title: string;
						};
						title: string;
					};
					speed: { select: { label: string; title: string } };
				};
				title: string;
			};
			playlistLength: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					wayToGetLength: {
						select: {
							label: string;
							title: string;
						};
					};
					wayToGetWatchTime: {
						select: {
							label: string;
							options: { duration: string; youtube: string };
							title: string;
						};
					};
				};
				title: string;
			};
			playlistManagementButtons: {
				settings: {
					markAsUnwatchedButton: {
						enable: {
							label: string;
							title: string;
						};
					};
					removeVideoButton: {
						enable: {
							label: string;
							title: string;
						};
					};
				};
				title: string;
			};
			screenshotButton: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					format: { label: string; title: string };
					saveAs: {
						select: {
							label: string;
							options: { both: string; clipboard: string; file: string };
							title: string;
						};
					};
				};
				title: string;
			};
			scrollWheelSpeedControl: {
				enable: {
					label: string;
					title: string;
				};
				extras: { optionLabel: string };
				settings: {
					adjustmentSteps: { label: string; title: string };
					modifierKey: { select: { label: string; title: string } };
				};
				title: string;
			};
			scrollWheelVolumeControl: {
				enable: {
					label: string;
					title: string;
				};
				extras: { optionLabel: string };
				settings: {
					adjustmentSteps: {
						label: string;
						title: string;
					};
					holdModifierKey: {
						label: string;
						select: { label: string; title: string };
						title: string;
					};
					holdRightClick: {
						label: string;
						title: string;
					};
				};
				title: string;
			};
			videoHistory: {
				enable: {
					label: string;
					title: string;
				};
				settings: {
					resumeType: {
						select: {
							label: string;
							options: { automatic: string; prompt: string };
							title: string;
						};
					};
				};
				title: string;
			};
			volumeBoost: {
				enable: { label: string; title: string };
				settings: {
					amount: { label: string; title: string };
					mode: {
						select: {
							label: string;
							options: { global: string; perVideo: string };
							title: string;
						};
					};
				};
				title: string;
			};
		};
	};
};
