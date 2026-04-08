import type { ZodArray, ZodError, ZodIssue, ZodObject, ZodOptional, ZodType } from "zod";

import fs from "node:fs";
import path from "node:path";
import { object, string } from "zod";

import type { NewTranslationStruct, OldTranslationStruct } from "@/src/i18n/types";
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends boolean | null | number | string | undefined ?
		undefined extends T[K] ?
			ZodOptional<ZodType<Exclude<T[K], undefined>>>
		:	ZodType<T[K]>
	:	ZodObject<TypeToZod<T[K]>>;
};
type TypeToZodSchema<T> = ZodObject<{
	[K in keyof T]: T[K] extends any[] ? ZodArray<ZodType<T[K][number]>>
	: T[K] extends object ? ZodObject<TypeToZod<T[K]>>
	: ZodType<T[K]>;
}>;
export const OldTranslationSchema: TypeToZodSchema<OldTranslationStruct> = object({
	langCode: string(),
	langName: string(),
	messages: object({
		resumingVideo: string(),
		settingVolume: string()
	}),
	pages: object({
		content: object({
			features: object({
				copyTimestampUrlButton: object({
					button: object({
						copied: string(),
						label: string()
					})
				}),
				featureMenu: object({
					button: object({
						label: string()
					})
				}),
				forwardRewindButtons: object({
					buttons: object({
						forwardButton: object({
							label: string()
						}),
						rewindButton: object({
							label: string()
						})
					})
				}),
				hideEndScreenCardsButton: object({
					button: object({
						label: string(),
						toggle: object({
							off: string(),
							on: string()
						})
					})
				}),
				loopButton: object({
					button: object({
						label: string(),
						toggle: object({
							off: string(),
							on: string()
						})
					})
				}),
				maximizePlayerButton: object({
					button: object({
						label: string(),
						toggle: object({
							off: string(),
							on: string()
						})
					})
				}),
				openTranscriptButton: object({
					button: object({
						label: string()
					})
				}),
				playbackSpeedButtons: object({
					buttons: object({
						decreasePlaybackSpeedButton: object({
							label: string()
						}),
						increasePlaybackSpeedButton: object({
							label: string()
						})
					}),
					decreaseLimit: string(),
					increaseLimit: string()
				}),
				playlistLength: object({
					title: string()
				}),
				screenshotButton: object({
					button: object({
						label: string()
					}),
					copiedToClipboard: string()
				}),
				videoHistory: object({
					resumeButton: string(),
					resumePrompt: object({
						close: string()
					})
				}),
				volumeBoostButton: object({
					button: object({
						label: string(),
						toggle: object({
							off: string(),
							on: string()
						})
					})
				})
			})
		}),
		options: object({
			notifications: object({
				error: object({
					optionConflict: string(),
					scrollWheelHoldModifierKey: object({
						sameKey: object({
							speedControl: string(),
							volumeControl: string()
						})
					})
				}),
				info: object({
					reset: string()
				}),
				success: object({
					saved: string()
				})
			})
		})
	}),
	settings: object({
		clearData: object({
			allDataDeleted: string(),
			confirmAlert: string()
		}),
		optionDisabled: object({
			either: object({
				label: string(),
				separator: string()
			}),
			plural: object({
				label: string(),
				separator: string()
			}),
			singular: string(),
			specificOption: object({
				featureMenu: string(),
				screenshotButtonFileFormat: string()
			})
		}),
		scrollForMoreSettings: string(),
		sections: object({
			automaticQuality: object({
				enable: object({
					label: string(),
					title: string()
				}),
				fallbackQualityStrategy: object({
					select: object({
						label: string(),
						options: object({
							higher: string(),
							lower: string()
						}),
						title: string()
					})
				}),
				select: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			bottomButtons: object({
				clear: object({
					title: string(),
					value: string()
				}),
				confirm: object({
					title: string(),
					value: string()
				}),
				openTab: object({
					title: string()
				}),
				reset: object({
					title: string(),
					value: string()
				})
			}),
			buttonPlacement: object({
				select: object({
					buttonNames: object({
						copyTimestampUrlButton: string(),
						decreasePlaybackSpeedButton: string(),
						forwardButton: string(),
						hideEndScreenCardsButton: string(),
						increasePlaybackSpeedButton: string(),
						loopButton: string(),
						maximizePlayerButton: string(),
						openTranscriptButton: string(),
						rewindButton: string(),
						screenshotButton: string(),
						volumeBoostButton: string()
					}),
					options: object({
						below_player: object({
							placement: string(),
							value: string()
						}),
						feature_menu: object({
							placement: string(),
							value: string()
						}),
						player_controls_left: object({
							placement: string(),
							value: string()
						}),
						player_controls_right: object({
							placement: string(),
							value: string()
						})
					}),
					title: string()
				}),
				title: string()
			}),
			customCSS: object({
				editor: object({
					collapse: string(),
					expand: string(),
					noProblems: string()
				}),
				enable: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			featureMenu: object({
				openType: object({
					select: object({
						label: string(),
						options: object({
							click: string(),
							hover: string()
						}),
						title: string()
					}),
					title: string()
				})
			}),
			forwardRewindButtons: object({
				enable: object({
					label: string(),
					title: string()
				}),
				time: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			importExportSettings: object({
				exportButton: object({
					success: string(),
					title: string(),
					value: string()
				}),
				importButton: object({
					error: object({
						unknown: string(),
						validation: string()
					}),
					success: string(),
					title: string(),
					value: string()
				})
			}),
			language: object({
				select: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			miscellaneous: object({
				features: object({
					automaticallyDisableAmbientMode: object({
						label: string(),
						title: string()
					}),
					automaticallyDisableAutoPlay: object({
						label: string(),
						title: string()
					}),
					automaticallyDisableClosedCaptions: object({
						label: string(),
						title: string()
					}),
					automaticallyEnableClosedCaptions: object({
						label: string(),
						title: string()
					}),
					automaticallyMaximizePlayer: object({
						label: string(),
						title: string()
					}),
					automaticallyShowMoreVideosOnEndScreen: object({
						label: string(),
						title: string()
					}),
					automaticTheaterMode: object({
						label: string(),
						title: string()
					}),
					copyTimestampUrlButton: object({
						label: string(),
						title: string()
					}),
					defaultToOriginalAudioTrack: object({
						label: string(),
						title: string()
					}),
					enableMarkAsUnwatchedButton: object({
						label: string(),
						title: string()
					}),
					enableRemoveVideoButton: object({
						label: string(),
						title: string()
					}),
					enableSaveToWatchLaterButton: object({
						label: string(),
						title: string()
					}),
					hideArtificialIntelligenceSummary: object({
						label: string(),
						title: string()
					}),
					hideEndScreenCards: object({
						label: string(),
						title: string()
					}),
					hideEndScreenCardsButton: object({
						label: string(),
						title: string()
					}),
					hideLiveStreamChat: object({
						label: string(),
						title: string()
					}),
					hideMembersOnlyVideos: object({
						label: string(),
						title: string()
					}),
					hideOfficialArtistVideosFromHomePage: object({
						label: string(),
						title: string()
					}),
					hidePaidPromotionBanner: object({
						label: string(),
						title: string()
					}),
					hidePlayables: object({
						label: string(),
						title: string()
					}),
					hidePlaylistRecommendationsFromHomePage: object({
						label: string(),
						title: string()
					}),
					hideScrollbar: object({
						label: string(),
						title: string()
					}),
					hideShorts: object({
						label: string(),
						title: string()
					}),
					hideSidebarRecommendedVideos: object({
						label: string(),
						title: string()
					}),
					hideTranslateComment: object({
						label: string(),
						title: string()
					}),
					loopButton: object({
						label: string(),
						title: string()
					}),
					maximizePlayerButton: object({
						label: string(),
						title: string()
					}),
					openTranscriptButton: object({
						label: string(),
						title: string()
					}),
					openYouTubeSettingsOnHover: object({
						label: string(),
						title: string()
					}),
					pauseBackgroundPlayers: object({
						label: string(),
						title: string()
					}),
					remainingTime: object({
						label: string(),
						title: string()
					}),
					rememberLastVolume: object({
						label: string(),
						title: string()
					}),
					removeRedirect: object({
						label: string(),
						title: string()
					}),
					restoreFullscreenScrolling: object({
						label: string(),
						title: string()
					}),
					shareShortener: object({
						label: string(),
						title: string()
					}),
					shortsAutoScroll: object({
						label: string(),
						title: string()
					}),
					skipContinueWatching: object({
						label: string(),
						title: string()
					})
				}),
				title: string()
			}),
			onScreenDisplaySettings: object({
				color: object({
					label: string(),
					options: object({
						blue: string(),
						green: string(),
						orange: string(),
						pink: string(),
						purple: string(),
						red: string(),
						white: string(),
						yellow: string()
					}),
					title: string()
				}),
				hide: object({
					label: string(),
					title: string()
				}),
				opacity: object({
					label: string(),
					title: string()
				}),
				padding: object({
					label: string(),
					title: string()
				}),
				position: object({
					label: string(),
					options: object({
						bottom_left: string(),
						bottom_right: string(),
						center: string(),
						top_left: string(),
						top_right: string()
					}),
					title: string()
				}),
				title: string(),
				type: object({
					label: string(),
					options: object({
						circle: string(),
						line: string(),
						no_display: string(),
						text: string()
					}),
					title: string()
				})
			}),
			playbackSpeed: object({
				enable: object({
					label: string(),
					title: string()
				}),
				playbackSpeedButtons: object({
					label: string(),
					select: object({
						label: string(),
						title: string()
					}),
					title: string()
				}),
				select: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			playlistLength: object({
				enable: object({
					label: string(),
					title: string()
				}),
				title: string(),
				wayToGetLength: object({
					select: object({
						label: string(),
						title: string()
					})
				}),
				wayToGetWatchTime: object({
					select: object({
						label: string(),
						options: object({
							duration: string(),
							youtube: string()
						}),
						title: string()
					})
				})
			}),
			playlistManagement: object({
				features: object({
					markAsUnwatchedButton: object({
						label: string(),
						title: string()
					}),
					removeVideoButton: object({
						label: string(),
						title: string()
					})
				}),
				title: string()
			}),
			playlistManagementButtons: object({
				failedToMarkAsUnwatched: string(),
				failedToRemoveVideo: string(),
				markAsUnwatched: string(),
				markingAsUnwatched: string(),
				removeVideo: string(),
				removingVideo: string()
			}),
			saveToWatchLaterButton: object({
				failedToSaveVideo: string(),
				saveVideo: string(),
				savingVideo: string()
			}),
			screenshotButton: object({
				enable: object({
					label: string(),
					title: string()
				}),
				saveAs: object({
					both: string(),
					clipboard: string(),
					file: string()
				}),
				selectFormat: object({
					label: string(),
					title: string()
				}),
				selectSaveAs: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			scrollWheelSpeedControl: object({
				adjustmentSteps: object({
					label: string(),
					title: string()
				}),
				enable: object({
					label: string(),
					title: string()
				}),
				optionLabel: string(),
				select: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			scrollWheelVolumeControl: object({
				adjustmentSteps: object({
					label: string(),
					title: string()
				}),
				enable: object({
					label: string(),
					title: string()
				}),
				holdModifierKey: object({
					enable: object({
						label: string(),
						title: string()
					}),
					optionLabel: string(),
					select: object({
						label: string(),
						title: string()
					})
				}),
				holdRightClick: object({
					enable: object({
						label: string(),
						title: string()
					})
				}),
				title: string()
			}),
			settingSearch: object({
				placeholder: string()
			}),
			videoHistory: object({
				enable: object({
					label: string(),
					title: string()
				}),
				resumeType: object({
					select: object({
						label: string(),
						options: object({
							automatic: string(),
							prompt: string()
						}),
						title: string()
					})
				}),
				title: string()
			}),
			volumeBoost: object({
				boostAmount: object({
					label: string(),
					title: string()
				}),
				enable: object({
					label: string(),
					title: string()
				}),
				mode: object({
					select: object({
						label: string(),
						options: object({
							global: string(),
							perVideo: string()
						}),
						title: string()
					})
				}),
				title: string()
			}),
			youtubeDataApiV3Key: object({
				getApiKeyLinkText: string(),
				input: object({
					label: string(),
					title: string()
				}),
				title: string()
			}),
			youtubeDeepDark: object({
				author: string(),
				"co-authors": string(),
				colors: object({
					colorShadow: object({
						label: string(),
						title: string()
					}),
					dimmerText: object({
						label: string(),
						title: string()
					}),
					hoverBackground: object({
						label: string(),
						title: string()
					}),
					mainBackground: object({
						label: string(),
						title: string()
					}),
					mainColor: object({
						label: string(),
						title: string()
					}),
					mainText: object({
						label: string(),
						title: string()
					}),
					secondBackground: object({
						label: string(),
						title: string()
					})
				}),
				enable: object({
					label: string(),
					title: string()
				}),
				select: object({
					label: string(),
					title: string()
				}),
				title: string()
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
					),
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

function printZodErrors(error: ZodError<any>) {
	const formatError = (issues: ZodIssue[], pathPrefix: string = "") => {
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
