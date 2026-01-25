import fs from "node:fs";
import path from "node:path";
import z from "zod";

import type { NewTranslationStruct, OldTranslationStruct } from "@/src/i18n/types";
import type { TypeToZodSchema } from "@/src/types";

export const OldTranslationSchema: TypeToZodSchema<OldTranslationStruct> = z.object({
	langCode: z.string(),
	langName: z.string(),
	messages: z.object({
		resumingVideo: z.string(),
		settingVolume: z.string()
	}),
	pages: z.object({
		content: z.object({
			features: z.object({
				copyTimestampUrlButton: z.object({
					button: z.object({
						copied: z.string(),
						label: z.string()
					})
				}),
				featureMenu: z.object({
					button: z.object({
						label: z.string()
					})
				}),
				forwardRewindButtons: z.object({
					buttons: z.object({
						forwardButton: z.object({
							label: z.string()
						}),
						rewindButton: z.object({
							label: z.string()
						})
					})
				}),
				hideEndScreenCardsButton: z.object({
					button: z.object({
						label: z.string(),
						toggle: z.object({
							off: z.string(),
							on: z.string()
						})
					})
				}),
				loopButton: z.object({
					button: z.object({
						label: z.string(),
						toggle: z.object({
							off: z.string(),
							on: z.string()
						})
					})
				}),
				maximizePlayerButton: z.object({
					button: z.object({
						label: z.string(),
						toggle: z.object({
							off: z.string(),
							on: z.string()
						})
					})
				}),
				openTranscriptButton: z.object({
					button: z.object({
						label: z.string()
					})
				}),
				playbackSpeedButtons: z.object({
					buttons: z.object({
						decreasePlaybackSpeedButton: z.object({
							label: z.string()
						}),
						increasePlaybackSpeedButton: z.object({
							label: z.string()
						})
					}),
					decreaseLimit: z.string(),
					increaseLimit: z.string()
				}),
				playlistLength: z.object({
					title: z.string()
				}),
				screenshotButton: z.object({
					button: z.object({
						label: z.string()
					}),
					copiedToClipboard: z.string()
				}),
				videoHistory: z.object({
					resumeButton: z.string(),
					resumePrompt: z.object({
						close: z.string()
					})
				}),
				volumeBoostButton: z.object({
					button: z.object({
						label: z.string(),
						toggle: z.object({
							off: z.string(),
							on: z.string()
						})
					})
				})
			})
		}),
		options: z.object({
			notifications: z.object({
				error: z.object({
					optionConflict: z.string(),
					scrollWheelHoldModifierKey: z.object({
						sameKey: z.object({
							speedControl: z.string(),
							volumeControl: z.string()
						})
					})
				}),
				info: z.object({
					reset: z.string()
				}),
				success: z.object({
					saved: z.string()
				})
			})
		})
	}),
	settings: z.object({
		clearData: z.object({
			allDataDeleted: z.string(),
			confirmAlert: z.string()
		}),
		optionDisabled: z.object({
			either: z.object({
				label: z.string(),
				separator: z.string()
			}),
			plural: z.object({
				label: z.string(),
				separator: z.string()
			}),
			singular: z.string(),
			specificOption: z.object({
				featureMenu: z.string(),
				screenshotButtonFileFormat: z.string()
			})
		}),
		scrollForMoreSettings: z.string(),
		sections: z.object({
			automaticQuality: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				fallbackQualityStrategy: z.object({
					select: z.object({
						label: z.string(),
						options: z.object({
							higher: z.string(),
							lower: z.string()
						}),
						title: z.string()
					})
				}),
				select: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			bottomButtons: z.object({
				clear: z.object({
					title: z.string(),
					value: z.string()
				}),
				confirm: z.object({
					title: z.string(),
					value: z.string()
				}),
				openTab: z.object({
					title: z.string()
				}),
				reset: z.object({
					title: z.string(),
					value: z.string()
				})
			}),
			buttonPlacement: z.object({
				select: z.object({
					buttonNames: z.object({
						copyTimestampUrlButton: z.string(),
						decreasePlaybackSpeedButton: z.string(),
						forwardButton: z.string(),
						hideEndScreenCardsButton: z.string(),
						increasePlaybackSpeedButton: z.string(),
						loopButton: z.string(),
						maximizePlayerButton: z.string(),
						openTranscriptButton: z.string(),
						rewindButton: z.string(),
						screenshotButton: z.string(),
						volumeBoostButton: z.string()
					}),
					options: z.object({
						below_player: z.object({
							placement: z.string(),
							value: z.string()
						}),
						feature_menu: z.object({
							placement: z.string(),
							value: z.string()
						}),
						player_controls_left: z.object({
							placement: z.string(),
							value: z.string()
						}),
						player_controls_right: z.object({
							placement: z.string(),
							value: z.string()
						})
					}),
					title: z.string()
				}),
				title: z.string()
			}),
			customCSS: z.object({
				editor: z.object({
					collapse: z.string(),
					expand: z.string(),
					noProblems: z.string()
				}),
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			featureMenu: z.object({
				openType: z.object({
					select: z.object({
						label: z.string(),
						options: z.object({
							click: z.string(),
							hover: z.string()
						}),
						title: z.string()
					}),
					title: z.string()
				})
			}),
			forwardRewindButtons: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				time: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			importExportSettings: z.object({
				exportButton: z.object({
					success: z.string(),
					title: z.string(),
					value: z.string()
				}),
				importButton: z.object({
					error: z.object({
						unknown: z.string(),
						validation: z.string()
					}),
					success: z.string(),
					title: z.string(),
					value: z.string()
				})
			}),
			language: z.object({
				select: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			miscellaneous: z.object({
				features: z.object({
					automaticallyDisableAmbientMode: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticallyDisableAutoPlay: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticallyDisableClosedCaptions: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticallyEnableClosedCaptions: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticallyMaximizePlayer: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticallyShowMoreVideosOnEndScreen: z.object({
						label: z.string(),
						title: z.string()
					}),
					automaticTheaterMode: z.object({
						label: z.string(),
						title: z.string()
					}),
					copyTimestampUrlButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					defaultToOriginalAudioTrack: z.object({
						label: z.string(),
						title: z.string()
					}),
					enableMarkAsUnwatchedButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					enableRemoveVideoButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					enableSaveToWatchLaterButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideArtificialIntelligenceSummary: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideEndScreenCards: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideEndScreenCardsButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideLiveStreamChat: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideMembersOnlyVideos: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideOfficialArtistVideosFromHomePage: z.object({
						label: z.string(),
						title: z.string()
					}),
					hidePaidPromotionBanner: z.object({
						label: z.string(),
						title: z.string()
					}),
					hidePlayables: z.object({
						label: z.string(),
						title: z.string()
					}),
					hidePlaylistRecommendationsFromHomePage: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideScrollbar: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideShorts: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideSidebarRecommendedVideos: z.object({
						label: z.string(),
						title: z.string()
					}),
					hideTranslateComment: z.object({
						label: z.string(),
						title: z.string()
					}),
					loopButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					maximizePlayerButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					openTranscriptButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					openYouTubeSettingsOnHover: z.object({
						label: z.string(),
						title: z.string()
					}),
					pauseBackgroundPlayers: z.object({
						label: z.string(),
						title: z.string()
					}),
					remainingTime: z.object({
						label: z.string(),
						title: z.string()
					}),
					rememberLastVolume: z.object({
						label: z.string(),
						title: z.string()
					}),
					removeRedirect: z.object({
						label: z.string(),
						title: z.string()
					}),
					restoreFullscreenScrolling: z.object({
						label: z.string(),
						title: z.string()
					}),
					shareShortener: z.object({
						label: z.string(),
						title: z.string()
					}),
					shortsAutoScroll: z.object({
						label: z.string(),
						title: z.string()
					}),
					skipContinueWatching: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				title: z.string()
			}),
			onScreenDisplaySettings: z.object({
				color: z.object({
					label: z.string(),
					options: z.object({
						blue: z.string(),
						green: z.string(),
						orange: z.string(),
						pink: z.string(),
						purple: z.string(),
						red: z.string(),
						white: z.string(),
						yellow: z.string()
					}),
					title: z.string()
				}),
				hide: z.object({
					label: z.string(),
					title: z.string()
				}),
				opacity: z.object({
					label: z.string(),
					title: z.string()
				}),
				padding: z.object({
					label: z.string(),
					title: z.string()
				}),
				position: z.object({
					label: z.string(),
					options: z.object({
						bottom_left: z.string(),
						bottom_right: z.string(),
						center: z.string(),
						top_left: z.string(),
						top_right: z.string()
					}),
					title: z.string()
				}),
				title: z.string(),
				type: z.object({
					label: z.string(),
					options: z.object({
						circle: z.string(),
						line: z.string(),
						no_display: z.string(),
						text: z.string()
					}),
					title: z.string()
				})
			}),
			playbackSpeed: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				playbackSpeedButtons: z.object({
					label: z.string(),
					select: z.object({
						label: z.string(),
						title: z.string()
					}),
					title: z.string()
				}),
				select: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			playlistLength: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string(),
				wayToGetLength: z.object({
					select: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				wayToGetWatchTime: z.object({
					select: z.object({
						label: z.string(),
						options: z.object({
							duration: z.string(),
							youtube: z.string()
						}),
						title: z.string()
					})
				})
			}),
			playlistManagement: z.object({
				features: z.object({
					markAsUnwatchedButton: z.object({
						label: z.string(),
						title: z.string()
					}),
					removeVideoButton: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				title: z.string()
			}),
			playlistManagementButtons: z.object({
				failedToMarkAsUnwatched: z.string(),
				failedToRemoveVideo: z.string(),
				markAsUnwatched: z.string(),
				markingAsUnwatched: z.string(),
				removeVideo: z.string(),
				removingVideo: z.string()
			}),
			saveToWatchLaterButton: z.object({
				failedToSaveVideo: z.string(),
				saveVideo: z.string(),
				savingVideo: z.string()
			}),
			screenshotButton: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				saveAs: z.object({
					both: z.string(),
					clipboard: z.string(),
					file: z.string()
				}),
				selectFormat: z.object({
					label: z.string(),
					title: z.string()
				}),
				selectSaveAs: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			scrollWheelSpeedControl: z.object({
				adjustmentSteps: z.object({
					label: z.string(),
					title: z.string()
				}),
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				optionLabel: z.string(),
				select: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			scrollWheelVolumeControl: z.object({
				adjustmentSteps: z.object({
					label: z.string(),
					title: z.string()
				}),
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				holdModifierKey: z.object({
					enable: z.object({
						label: z.string(),
						title: z.string()
					}),
					optionLabel: z.string(),
					select: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				holdRightClick: z.object({
					enable: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				title: z.string()
			}),
			settingSearch: z.object({
				placeholder: z.string()
			}),
			videoHistory: z.object({
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				resumeType: z.object({
					select: z.object({
						label: z.string(),
						options: z.object({
							automatic: z.string(),
							prompt: z.string()
						}),
						title: z.string()
					})
				}),
				title: z.string()
			}),
			volumeBoost: z.object({
				boostAmount: z.object({
					label: z.string(),
					title: z.string()
				}),
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				mode: z.object({
					select: z.object({
						label: z.string(),
						options: z.object({
							global: z.string(),
							perVideo: z.string()
						}),
						title: z.string()
					})
				}),
				title: z.string()
			}),
			youtubeDataApiV3Key: z.object({
				getApiKeyLinkText: z.string(),
				input: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			}),
			youtubeDeepDark: z.object({
				author: z.string(),
				"co-authors": z.string(),
				colors: z.object({
					colorShadow: z.object({
						label: z.string(),
						title: z.string()
					}),
					dimmerText: z.object({
						label: z.string(),
						title: z.string()
					}),
					hoverBackground: z.object({
						label: z.string(),
						title: z.string()
					}),
					mainBackground: z.object({
						label: z.string(),
						title: z.string()
					}),
					mainColor: z.object({
						label: z.string(),
						title: z.string()
					}),
					mainText: z.object({
						label: z.string(),
						title: z.string()
					}),
					secondBackground: z.object({
						label: z.string(),
						title: z.string()
					})
				}),
				enable: z.object({
					label: z.string(),
					title: z.string()
				}),
				select: z.object({
					label: z.string(),
					title: z.string()
				}),
				title: z.string()
			})
		})
	})
});

type CliOptions = {
	dryRun: boolean;
	inputPath: string;
	outPath?: string;
	replace: boolean;
};

function backupFile(filePath: string) {
	const backupPath = `${filePath}.bak`;
	if (!fs.existsSync(backupPath)) {
		fs.copyFileSync(filePath, backupPath);
	}
}

/* Migrates old translations as of commit (87f87bddfba0480923e198f7538baefc5bb1d103) v1.31.1*/
function migrate(old: OldTranslationStruct): NewTranslationStruct {
	return {
		langCode: old.langCode,
		langName: old.langName,
		messages: {
			resumingVideo: old.messages.resumingVideo,
			settingVolume: old.messages.settingVolume
		},
		pages: {
			content: {
				features: {
					copyTimestampUrlButton: {
						button: {
							label: old.pages.content.features.copyTimestampUrlButton.button.label
						},
						extras: {
							copied: old.pages.content.features.copyTimestampUrlButton.button.copied
						}
					},
					featureMenu: old.pages.content.features.featureMenu,
					forwardRewindButtons: old.pages.content.features.forwardRewindButtons,
					hideEndScreenCardsButton: old.pages.content.features.hideEndScreenCardsButton,
					loopButton: old.pages.content.features.loopButton,
					maximizePlayerButton: old.pages.content.features.maximizePlayerButton,
					openTranscriptButton: old.pages.content.features.openTranscriptButton,
					playbackSpeedButtons: {
						buttons: old.pages.content.features.playbackSpeedButtons.buttons,
						extras: {
							decreaseLimit: old.pages.content.features.playbackSpeedButtons.decreaseLimit,
							increaseLimit: old.pages.content.features.playbackSpeedButtons.increaseLimit
						}
					},
					playlistLength: old.pages.content.features.playlistLength,
					playlistManagementButtons: {
						extras: old.settings.sections.playlistManagementButtons
					},
					saveToWatchLaterButton: {
						extras: old.settings.sections.saveToWatchLaterButton
					},
					screenshotButton: {
						button: old.pages.content.features.screenshotButton.button,
						extras: {
							copiedToClipboard: old.pages.content.features.screenshotButton.copiedToClipboard
						}
					},
					videoHistory: {
						extras: {
							resumeButton: old.pages.content.features.videoHistory.resumeButton,
							resumePromptClose: old.pages.content.features.videoHistory.resumePrompt.close
						}
					},
					volumeBoostButton: old.pages.content.features.volumeBoostButton
				}
			},
			options: {
				extras: {
					bottomButtons: old.settings.sections.bottomButtons,
					buttonPlacement: old.settings.sections.buttonPlacement,
					clearData: old.settings.clearData,
					featureMenu: old.settings.sections.featureMenu,
					importExportSettings: old.settings.sections.importExportSettings,
					language: old.settings.sections.language,
					optionDisabled: old.settings.optionDisabled,
					scrollForMoreSettings: old.settings.scrollForMoreSettings,
					settingSearch: old.settings.sections.settingSearch,
					youtubeDataApiV3Key: old.settings.sections.youtubeDataApiV3Key
				},
				notifications: old.pages.options.notifications
			}
		},
		settings: {
			sections: {
				customCSS: {
					enable: old.settings.sections.customCSS.enable,
					extras: old.settings.sections.customCSS.editor,
					title: old.settings.sections.customCSS.title
				},
				deepDarkCSS: {
					enable: old.settings.sections.youtubeDeepDark.enable,
					extras: {
						author: old.settings.sections.youtubeDeepDark.author,
						"co-authors": old.settings.sections.youtubeDeepDark["co-authors"]
					},
					settings: {
						...old.settings.sections.youtubeDeepDark.colors,
						theme: {
							select: old.settings.sections.youtubeDeepDark.select
						}
					},
					title: old.settings.sections.youtubeDeepDark.title
				},
				forwardRewindButtons: {
					enable: old.settings.sections.forwardRewindButtons.enable,
					settings: {
						time: old.settings.sections.forwardRewindButtons.time
					},
					title: old.settings.sections.forwardRewindButtons.title
				},
				miscellaneous: {
					settings: Object.fromEntries(
						Object.entries(old.settings.sections.miscellaneous.features)
							.map(([key, value]) => {
								switch (key) {
									case "enableMarkAsUnwatchedButton":
									case "enableRemoveVideoButton": {
										return null;
									}
									case "enableSaveToWatchLaterButton": {
										return [
											"saveToWatchLaterButton",
											{
												enable: value
											}
										];
									}
									case "rememberLastVolume": {
										return [
											"rememberVolume",
											{
												enable: value
											}
										];
									}
									default:
										return [
											key,
											{
												enable: value
											}
										];
								}
							})
							.filter(Boolean)
					) as any,
					title: old.settings.sections.miscellaneous.title
				},
				onScreenDisplaySettings: {
					settings: {
						color: {
							label: old.settings.sections.onScreenDisplaySettings.color.label,
							select: {
								options: old.settings.sections.onScreenDisplaySettings.color.options
							},
							title: old.settings.sections.onScreenDisplaySettings.color.title
						},
						hide: old.settings.sections.onScreenDisplaySettings.hide,
						opacity: old.settings.sections.onScreenDisplaySettings.opacity,
						padding: old.settings.sections.onScreenDisplaySettings.padding,
						position: {
							label: old.settings.sections.onScreenDisplaySettings.position.label,
							select: {
								options: old.settings.sections.onScreenDisplaySettings.position.options
							},
							title: old.settings.sections.onScreenDisplaySettings.position.title
						},
						type: {
							label: old.settings.sections.onScreenDisplaySettings.type.label,
							select: {
								options: old.settings.sections.onScreenDisplaySettings.type.options
							},
							title: old.settings.sections.onScreenDisplaySettings.type.title
						}
					},
					title: old.settings.sections.onScreenDisplaySettings.title
				},
				playerQuality: {
					enable: old.settings.sections.automaticQuality.enable,
					settings: {
						quality: {
							select: old.settings.sections.automaticQuality.select
						},
						qualityFallbackStrategy: {
							select: old.settings.sections.automaticQuality.fallbackQualityStrategy.select
						}
					},
					title: old.settings.sections.automaticQuality.title
				},
				playerSpeed: {
					enable: old.settings.sections.playbackSpeed.enable,
					settings: {
						buttons: old.settings.sections.playbackSpeed.playbackSpeedButtons,
						speed: {
							select: old.settings.sections.playbackSpeed.select
						}
					},
					title: old.settings.sections.playbackSpeed.title
				},
				playlistLength: {
					enable: old.settings.sections.playlistLength.enable,
					settings: {
						wayToGetLength: old.settings.sections.playlistLength.wayToGetLength,
						wayToGetWatchTime: old.settings.sections.playlistLength.wayToGetWatchTime
					},
					title: old.settings.sections.playlistLength.title
				},
				playlistManagementButtons: {
					settings: {
						markAsUnwatchedButton: {
							enable: old.settings.sections.playlistManagement.features.markAsUnwatchedButton
						},
						removeVideoButton: {
							enable: old.settings.sections.playlistManagement.features.removeVideoButton
						}
					},
					title: old.settings.sections.playlistManagement.title
				},
				screenshotButton: {
					enable: old.settings.sections.screenshotButton.enable,
					settings: {
						format: old.settings.sections.screenshotButton.selectFormat,
						saveAs: {
							select: {
								options: old.settings.sections.screenshotButton.saveAs,
								...old.settings.sections.screenshotButton.selectSaveAs
							}
						}
					},
					title: old.settings.sections.screenshotButton.title
				},
				scrollWheelSpeedControl: {
					enable: old.settings.sections.scrollWheelSpeedControl.enable,
					extras: {
						optionLabel: old.settings.sections.scrollWheelSpeedControl.optionLabel
					},
					settings: {
						adjustmentSteps: old.settings.sections.scrollWheelSpeedControl.adjustmentSteps,
						modifierKey: {
							select: old.settings.sections.scrollWheelSpeedControl.select
						}
					},
					title: old.settings.sections.scrollWheelSpeedControl.title
				},
				scrollWheelVolumeControl: {
					enable: old.settings.sections.scrollWheelVolumeControl.enable,
					extras: {
						optionLabel: old.settings.sections.scrollWheelVolumeControl.holdModifierKey.optionLabel
					},
					settings: {
						adjustmentSteps: old.settings.sections.scrollWheelVolumeControl.adjustmentSteps,
						holdModifierKey: {
							label: old.settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.label,
							select: old.settings.sections.scrollWheelVolumeControl.holdModifierKey.select,
							title: old.settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.title
						},
						holdRightClick: old.settings.sections.scrollWheelVolumeControl.holdRightClick.enable
					},
					title: old.settings.sections.scrollWheelVolumeControl.title
				},
				videoHistory: {
					enable: old.settings.sections.videoHistory.enable,
					settings: {
						resumeType: old.settings.sections.videoHistory.resumeType
					},
					title: old.settings.sections.videoHistory.title
				},
				volumeBoost: {
					enable: old.settings.sections.volumeBoost.enable,
					settings: {
						amount: old.settings.sections.volumeBoost.boostAmount,
						mode: old.settings.sections.volumeBoost.mode
					},
					title: old.settings.sections.volumeBoost.title
				}
			}
		}
	};
}

function parseArgs(argv: string[]): CliOptions {
	let inputPath = "";
	let replace = false;
	let dryRun = false;
	let outPath: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const { [i]: arg } = argv;
		switch (arg) {
			case "--dry-run":
				dryRun = true;
				break;
			case "--help":
				printHelp();
				process.exit(0);
			// eslint-disable-next-line no-fallthrough -- Break is unreachable after the above line
			case "--out":
				outPath = argv.at(++i)!;
				break;
			case "--replace":
				replace = true;
				break;
			default:
				if (!arg.startsWith("-") && !inputPath) {
					inputPath = arg;
				}
		}
	}
	if (!inputPath) {
		printHelp();
		throw new Error("Missing input file or folder");
	}
	if (replace && outPath) {
		throw new Error("--replace and --out cannot be used together");
	}
	return { dryRun, inputPath, outPath, replace };
}

function printHelp() {
	console.log(`
Usage:
  ts-node migrate-translation.ts <file.json|folder> [options]

Options:
  --replace        Replace the original file(s) (creates .bak)
  --out <path>     Write output to a specific file or folder
  --dry-run        Validate + migrate without writing
  --help           Show this help message
`);
}

function printZodErrors(error: z.ZodError<any>) {
	const formatError = (issues: z.ZodIssue[], pathPrefix: string = "") => {
		for (const issue of issues) {
			const path = [...(pathPrefix ? [pathPrefix] : []), ...issue.path].join(".");
			console.log(`❌ ${path || "(root)"} → ${issue.message}`);
		}
	};
	formatError(error.issues);
}

function processFile(filePath: string, options: CliOptions, folderOutPath?: string) {
	const raw = readJson(filePath);
	const parsed = OldTranslationSchema.safeParse(raw);
	if (!parsed.success) {
		console.error(`❌ Invalid legacy translation file: ${filePath}`);
		printZodErrors(parsed.error);
		return false;
	}
	const migrated = migrate(parsed.data);
	const outputPath =
		options.outPath ?
			fs.lstatSync(options.outPath).isDirectory() ?
				path.join(options.outPath, path.basename(filePath))
			:	options.outPath
		: folderOutPath ? path.join(folderOutPath, path.basename(filePath))
		: options.replace ? filePath
		: filePath.replace(/\.json$/, ".new.json");

	if (options.dryRun) {
		console.log(`✔ Dry run successful: ${filePath}`);
		return true;
	}
	if (options.replace) backupFile(filePath);
	writeAtomic(outputPath, JSON.stringify(migrated, null, 2));
	console.log(`✔ Migrated → ${outputPath}`);
	return true;
}

function readJson<T>(filePath: string): T {
	const raw = fs.readFileSync(filePath, "utf8");
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new Error(`Invalid JSON: ${filePath}`);
	}
}

function writeAtomic(filePath: string, data: string) {
	const tmpPath = `${filePath}.tmp`;
	fs.writeFileSync(tmpPath, data, "utf8");
	fs.renameSync(tmpPath, filePath);
}

const { dryRun, inputPath, outPath, replace } = parseArgs(process.argv.slice(2));

if (fs.lstatSync(inputPath).isDirectory()) {
	const files = fs.readdirSync(inputPath).filter((f) => f.endsWith(".json"));
	if (!files.length) {
		console.error("No JSON files found in folder");
		process.exit(1);
	}
	for (const file of files) {
		processFile(path.join(inputPath, file), { dryRun, inputPath, outPath, replace });
	}
} else {
	processFile(inputPath, { dryRun, inputPath, outPath, replace });
}
