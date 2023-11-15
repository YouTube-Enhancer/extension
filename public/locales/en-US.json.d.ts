interface EnUS {
	langCode: "en-US";
	langName: "English (US)";
	messages: {
		resumingVideo: "Resuming video at {{VIDEO_TIME}}";
		settingVolume: "Setting volume boost to {{VOLUME_BOOST_AMOUNT}}";
	};
	pages: {
		content: {
			features: {
				featureMenu: { label: "Feature menu" };
				loopButton: { label: "Loop" };
				maximizePlayerButton: { label: "Maximize" };
				screenshotButton: { copiedToClipboard: "Screenshot copied to clipboard"; label: "Screenshot" };
				videoHistory: { resumeButton: "Resume"; resumePrompt: { close: "Close" } };
			};
		};
		options: {
			notifications: {
				error: {
					playerQuality: "You must select a player quality if you want to enable the automatic quality feature.";
				};
				info: {
					reset: 'All options have been reset to their default values.\nYou can now save the changes by clicking the "Confirm" button or discard them by closing this page or ignore this notification.';
				};
				success: { saved: "Options saved." };
			};
		};
	};
	settings: {
		clearData: {
			allDataDeleted: "All data has been deleted.";
			confirmAlert: "This will delete all extension data related to options. Continue?";
		};
		sections: {
			automaticQuality: {
				enable: {
					label: "Enable automatic quality adjustment";
					title: "Automatically adjusts the video quality to the selected level.";
				};
				select: { label: "Player quality"; title: "The quality to set the video to" };
				title: "Automatic quality settings";
			};
			bottomButtons: {
				clear: {
					title: "Clears all data this extension has stored on your machine";
					value: "Clear Data";
				};
				confirm: { title: "Confirm setting reset"; value: "Confirm" };
				reset: {
					title: "Resets all settings to their defaults, Click the confirm button to save the changes";
					value: "Reset";
				};
			};
			importExportSettings: {
				exportButton: {
					success: "Settings successfully exported";
					title: "Export settings to a JSON file";
					value: "Export Settings";
				};
				importButton: {
					error: {
						unknown: "Error importing settings. Please check the file format.\nAn unknown error occurred.";
						validation: "Error importing settings. Please check the file format.\n{{ERROR_MESSAGE}}";
					};
					success: "Settings imported successfully";
					title: "Import settings from a JSON file";
					value: "Import Settings";
				};
			};
			language: {
				select: { label: "Language"; title: "The language to use for the extension" };
				title: "Language";
			};
			miscellaneous: {
				features: {
					hideScrollbar: { label: "Enable hide scrollbar"; title: "Hides the pages scrollbar" };
					loopButton: {
						label: "Enable loop button";
						title: "Adds a button to the player to loop the video you're watching";
					};
					maximizePlayerButton: {
						label: "Enable maximize player button";
						title: "Fills the video to the window size";
					};
					remainingTime: {
						label: "Enable remaining time";
						title: "Shows the remaining time of the video you're watching";
					};
					rememberLastVolume: {
						label: "Remember last volume";
						title: "Remembers the volume you were watching at and sets it as the volume when you open a new video";
					};
					videoHistory: {
						label: "Enable video history";
						title: "Keeps track of where you left off on videos you were watching and asks if you want to resume when that video loads again";
					};
				};
				title: "Miscellaneous settings";
			};
			playbackSpeed: {
				enable: {
					label: "Enable forced playback speed";
					title: "Sets the video speed to what you choose below";
				};
				select: { label: "Player speed"; title: "The speed to set the video to" };
				title: "Playback speed settings";
			};
			screenshotButton: {
				enable: {
					label: "Enable screenshot button";
					title: "Adds a button to the player to take a screenshot of the video";
				};
				format: { jpeg: "JPEG"; png: "PNG"; webp: "WebP" };
				saveAs: { clipboard: "Clipboard"; file: "File" };
				selectFormat: { label: "Screenshot format"; title: "The format to save the screenshot in" };
				selectSaveAs: { label: "Screenshot save type"; title: "The screenshot save type" };
				title: "Screenshot settings";
			};
			scrollWheelVolumeControl: {
				enable: {
					label: "Enable scroll wheel volume control";
					title: "Lets you use the scroll wheel to control the volume of the video you're watching";
				};
				onScreenDisplay: {
					colors: {
						blue: "Blue";
						green: "Green";
						orange: "Orange";
						pink: "Pink";
						purple: "Purple";
						red: "Red";
						white: "White";
						yellow: "Yellow";
					};
					position: {
						bottom_left: "Bottom Left";
						bottom_right: "Bottom Right";
						center: "Center";
						top_left: "Top Left";
						top_right: "Top Right";
					};
					type: { line: "Line"; no_display: "No display"; round: "Round"; text: "Text" };
				};
				osdColor: { label: "OSD color"; title: "The color of the On Screen Display" };
				osdHide: {
					label: "Time to hide";
					title: "The amount of milliseconds to wait before hiding the OSD";
				};
				osdOpacity: { label: "OSD opacity"; title: "The opacity of the On Screen Display" };
				osdPadding: {
					label: "Padding";
					title: "The amount of padding to add to the OSD (in pixels, only applies to corner OSD)";
				};
				osdPosition: { label: "OSD position"; title: "The position of the On Screen Display" };
				osdType: { label: "OSD type"; title: "The type of On Screen Display" };
				osdVolumeAdjustmentSteps: { label: "Amount to adjust"; title: "The amount to adjust volume per scroll" };
				title: "Scroll wheel volume control settings";
			};
			volumeBoost: {
				enable: {
					label: "Enable volume boost";
					title: "Boosts the volume of the video you're watching";
				};
				number: { label: "Volume boost amount (dB)"; title: "The amount to boost the volume by" };
				title: "Volume boost settings";
			};
		};
	};
}

declare const EnUS: EnUS;

export = EnUS;
