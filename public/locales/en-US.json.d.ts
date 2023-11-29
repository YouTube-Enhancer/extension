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
				volumeBoostButton: { label: "Volume Boost" };
			};
		};
		options: {
			notifications: {
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
					automaticTheaterMode: {
						label: "Enable automatic theater mode";
						title: "Automatically enables theater mode when you load a video";
					};
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
						title: "Remembers the volume of the last video you were watching and sets it when you open a new video";
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
				holdModifierKey: {
					enable: {
						label: "Enable hold modifier key";
						title: "Press a modifier key to enable volume adjustment with the scroll wheel.";
					};
					optionLabel: "{{KEY}} key";
					select: { label: "Modifier key"; title: "The modifier key to use" };
				};
				holdRightClick: {
					enable: {
						label: "Enable hold right click";
						title: "Hold right click to enable scroll wheel volume control";
					};
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
				osdColor: { label: "OSD Color"; title: "Select the color for the On-Screen Display" };
				osdHide: {
					label: "Hide Delay";
					title: "Specify the time, in milliseconds, before automatically hiding the OSD";
				};
				osdOpacity: {
					label: "OSD Opacity";
					title: "Adjust the transparency of the On-Screen Display";
				};
				osdPadding: {
					label: "Padding";
					title: "Adjust the spacing around the on-screen display (OSD) in pixels. This applies specifically to corner OSD.";
				};
				osdPosition: { label: "OSD Position"; title: "Select the position of the On-Screen Display" };
				osdType: { label: "OSD Type"; title: "Select the style of On-Screen Display" };
				osdVolumeAdjustmentSteps: {
					label: "Volume Change Per Scroll";
					title: "Adjust the volume change per scroll";
				};
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
