import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";

import CustomCheckbox from "@/src/components/CheckBox";
import { useNotifications } from "@/hooks";
import CustomNumberInput from "@/src/components/Number/Number";
import { CustomSelect, CustomSelectOption } from "@/src/components/Select";
import { configuration, configurationKeys } from "@/src/types";
import { browserColorLog } from "@/src/utils/utilities";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import React, { ChangeEvent, useEffect, Dispatch, SetStateAction } from "react";

export default function Settings({
	settings,
	setSettings,
	selectedColor,
	setSelectedColor,
	selectedDisplayType,
	setSelectedDisplayType,
	selectedDisplayPosition,
	setSelectedDisplayPosition,
	selectedPlayerQuality,
	setSelectedPlayerQuality,
	defaultSettings
}: {
	settings: configuration | undefined;
	setSettings: Dispatch<SetStateAction<configuration | undefined>>;
	selectedColor: string | undefined;
	setSelectedColor: Dispatch<SetStateAction<string | undefined>>;
	selectedDisplayType: string | undefined;
	setSelectedDisplayType: Dispatch<SetStateAction<string | undefined>>;
	selectedDisplayPosition: string | undefined;
	setSelectedDisplayPosition: Dispatch<SetStateAction<string | undefined>>;
	selectedPlayerQuality: string | undefined;
	setSelectedPlayerQuality: Dispatch<SetStateAction<string | undefined>>;
	defaultSettings: configuration;
}) {
	const [parentRef] = useAutoAnimate({ duration: 300 });
	const { notifications, addNotification, removeNotification } = useNotifications();
	const setCheckboxOption =
		(key: configurationKeys) =>
		({ currentTarget: { checked } }: ChangeEvent<HTMLInputElement>) => {
			setSettings((options) => (options ? { ...options, [key]: checked } : undefined));
		};

	const setValueOption =
		(key: configurationKeys) =>
		({ currentTarget: { value } }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setSettings((state) => (state ? { ...state, [key]: value } : undefined));
		};

	function saveOptions() {
		if (settings) {
			if (settings.enable_automatically_set_quality && !settings.player_quality) {
				addNotification("error", "You must select a player quality if you want to enable the automatic quality feature.");
				return;
			}
			Object.assign(localStorage, settings);
			chrome.storage.local.set(settings);

			addNotification("success", "Options saved");
		}
	}

	function resetOptions() {
		setSettings({ ...defaultSettings });
		addNotification(
			"info",
			"All options have been reset to their default values. You can now save the changes you made or discard them by closing this page."
		);
	}

	function clearData() {
		const userHasConfirmed = window.confirm("This will delete all extension data related to options. Continue?");
		if (userHasConfirmed) {
			localStorage.clear();
			chrome.storage.local.clear();
			window.location.reload();
		}
	}
	const colorOptions: CustomSelectOption[] = [
		{
			value: "red",
			label: "Red",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[red]`}></div>
		},
		{
			value: "green",
			label: "Green",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[green]`}></div>
		},
		{
			value: "blue",
			label: "Blue",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[blue]`}></div>
		},
		{
			value: "yellow",
			label: "Yellow",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[yellow]`}></div>
		},
		{
			value: "orange",
			label: "Orange",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[orange]`}></div>
		},
		{
			value: "purple",
			label: "Purple",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[purple]`}></div>
		},
		{
			value: "pink",
			label: "Pink",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[pink]`}></div>
		},
		{
			value: "white",
			label: "White",
			element: <div className={`m-2 h-2 w-2 rounded-[50%] bg-[white]`}></div>
		}
	];
	const OSD_DisplayTypeOptions: CustomSelectOption[] = [
		{
			value: "no_display",
			label: "No display"
		},
		{
			value: "text",
			label: "Text"
		},
		{
			value: "line",
			label: "Line"
		},
		{
			value: "round",
			label: "Round"
		}
	];
	const OSD_PositionOptions: CustomSelectOption[] = [
		{
			value: "top_left",
			label: "Top left"
		},
		{
			value: "top_right",
			label: "Top right"
		},
		{
			value: "bottom_left",
			label: "Bottom left"
		},
		{
			value: "bottom_right",
			label: "Bottom right"
		},
		{
			value: "center",
			label: "Center"
		}
	];
	const YouTubePlayerQualityOptions: CustomSelectOption[] = [
		{ label: "144p", value: "tiny" },
		{ label: "240p", value: "small" },
		{ label: "360p", value: "medium" },
		{ label: "480p", value: "large" },
		{ label: "720p", value: "hd720" },
		{ label: "1080p", value: "hd1080" },
		{ label: "1440p", value: "hd1440" },
		{ label: "2160p", value: "hd2160" },
		{ label: "2880p", value: "hd2880" },
		{ label: "4320p", value: "highres" },
		{ label: "auto", value: "auto" }
	].reverse();
	useEffect(() => {
		browserColorLog(JSON.stringify(settings, null, 2), "FgYellow");
	}, [settings]);
	return (
		settings && (
			<div className="w-fit h-fit bg-[#f5f5f5] text-black dark:bg-[#181a1b] dark:text-white">
				<h1 className="flex gap-3 items-center content-center font-bold text-xl sm:text-2xl md:text-3xl">
					<img src="/icons/icon_128.png" className="h-16 w-16 sm:h-16 sm:w-16" />
					YouTube Enhancer
					<small className="light text-xs sm:text-sm md:text-base">v{chrome.runtime.getManifest().version}</small>
				</h1>

				<fieldset className="mx-1">
					<legend className="mb-1 text-lg sm:text-xl md:text-2xl">General options</legend>

					<CustomCheckbox
						id="enable_remember_last_volume"
						title="Remembers the volume you were watching at and sets it as the volume when you open a new video"
						label="Remember last volume"
						checked={settings.enable_remember_last_volume.toString() === "true"}
						onChange={setCheckboxOption("enable_remember_last_volume")}
					/>
				</fieldset>

				<fieldset className="mx-1">
					<legend className="mb-1 text-lg sm:text-xl md:text-2xl">Scroll wheel volume control options</legend>
					<CustomCheckbox
						id="enable_scroll_wheel_volume_control"
						title="Lets you use the scroll wheel to control the volume of the video you're watching"
						label="Enable scroll wheel volume control"
						checked={settings.enable_scroll_wheel_volume_control.toString() === "true"}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
					/>
					<div className="mx-2 mb-1" title="The color of the On Screen Display">
						<CustomSelect
							id="osd_color_select"
							onChange={setValueOption("osd_display_color")}
							options={colorOptions}
							selectedOption={selectedColor}
							setSelectedOption={setSelectedColor}
							label="OSD color"
						/>
					</div>

					<div className="mx-2 mb-1" title="The type of On Screen Display">
						<CustomSelect
							id="osd_display_type"
							onChange={setValueOption("osd_display_type")}
							options={OSD_DisplayTypeOptions}
							selectedOption={selectedDisplayType}
							setSelectedOption={setSelectedDisplayType}
							label="OSD type"
						/>
					</div>

					<div className="mx-2 mb-1" title="The position of the On Screen Display">
						<CustomSelect
							id="osd_display_position"
							onChange={setValueOption("osd_display_position")}
							options={OSD_PositionOptions}
							selectedOption={selectedDisplayPosition}
							setSelectedOption={setSelectedDisplayPosition}
							label="OSD position"
						/>
					</div>

					<div className="mx-2 mb-1" title="The opacity of the On Screen Display">
						<CustomNumberInput
							id="osd_display_opacity"
							min={1}
							max={100}
							value={settings.osd_display_opacity}
							onChange={setValueOption("osd_display_opacity")}
							label="OSD opacity"
						/>
					</div>

					<div className="mx-2 mb-1" title="The amount to adjust volume per scroll">
						<CustomNumberInput
							id="volume_adjustment_steps"
							min={1}
							value={settings.volume_adjustment_steps}
							onChange={setValueOption("volume_adjustment_steps")}
							label="Amount to adjust"
						/>
					</div>
				</fieldset>

				<fieldset className="mx-1">
					<legend className="mb-1 text-lg sm:text-xl md:text-2xl">Automatically set quality</legend>
					<CustomCheckbox
						id="enable_automatically_set_quality"
						title="Automatically sets the quality of the video to the quality you choose below"
						label="Enable auto set quality"
						checked={settings.enable_automatically_set_quality.toString() === "true"}
						onChange={setCheckboxOption("enable_automatically_set_quality")}
					/>
					<div className="mx-2 mb-1" title="The quality to set the video to">
						<CustomSelect
							id="player_quality"
							onChange={setValueOption("player_quality")}
							options={YouTubePlayerQualityOptions}
							selectedOption={selectedPlayerQuality}
							setSelectedOption={setSelectedPlayerQuality}
							label="Player quality"
						/>
					</div>
				</fieldset>
				<div className="flex gap-1 m-2">
					<input
						type="button"
						id="clear_data_button"
						className="p-2 danger dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
						value="Clear Data"
						title="Clears all data this extension has stored on your machine"
						onClick={clearData}
					/>

					<input
						type="button"
						id="reset_button"
						className="p-2 neutral dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
						style={{ marginLeft: "auto" }}
						value="Reset"
						title="Resets all settings to their defaults; save afterwards to preserve the changes"
						onClick={resetOptions}
					/>

					<input
						type="button"
						id="save_button"
						className="p-2 accent dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
						value="Save"
						title="Saves the current settings"
						onClick={saveOptions}
					/>
				</div>

				{/* <!-- TODO: Animate --> */}
				<div id="notifications" ref={parentRef}>
					{notifications.map((notification, index) => (
						<div
							className={`relative notification ${
								notification.type === "success"
									? "bg-green-600"
									: notification.type === "error"
									? "bg-red-600"
									: notification.type === "info"
									? "bg-blue-600"
									: notification.type === "warning"
									? "bg-yellow-600"
									: "bg-teal-600"
							} inverse`}
							key={index}
						>
							{notification.message}
							<button className="text-base font-normal absolute top-[-1px] right-[5px]" onClick={() => removeNotification(notification)}>
								&times;
							</button>
						</div>
					))}
				</div>
			</div>
		)
	);
}
