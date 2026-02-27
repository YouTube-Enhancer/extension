import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function MiscellaneousSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.miscellaneous.title)}>
			<SettingTitle />
			<Setting
				checked={settings.globalVolume.enabled?.toString() !== "true" && settings.rememberVolume.enabled?.toString() === "true"}
				disabled={settings.globalVolume.enabled?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.extras.optionDisabled.specificOption.rememberVolume)}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.label)}
				onChange={setCheckboxOption("rememberVolume.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.maximizePlayerButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.label)}
				onChange={setCheckboxOption("maximizePlayerButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyMaximizePlayer.enabled.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.label)}
				onChange={setCheckboxOption("automaticallyMaximizePlayer.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.remainingTime.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.label)}
				onChange={setCheckboxOption("remainingTime.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.pauseBackgroundPlayers.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.label)}
				onChange={setCheckboxOption("pauseBackgroundPlayers.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.loopButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.label)}
				onChange={setCheckboxOption("loopButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.copyTimestampUrlButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.label)}
				onChange={setCheckboxOption("copyTimestampUrlButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideScrollBar.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.label)}
				onChange={setCheckboxOption("hideScrollBar.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticTheaterMode.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.label)}
				onChange={setCheckboxOption("automaticTheaterMode.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.openTranscriptButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.label)}
				onChange={setCheckboxOption("openTranscriptButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.openYouTubeSettingsOnHover.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.label)}
				onChange={setCheckboxOption("openYouTubeSettingsOnHover.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.removeRedirect.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.label)}
				onChange={setCheckboxOption("removeRedirect.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.shareShortener.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.label)}
				onChange={setCheckboxOption("shareShortener.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.skipContinueWatching.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.label)}
				onChange={setCheckboxOption("skipContinueWatching.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.shortsAutoScroll.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.label)}
				onChange={setCheckboxOption("shortsAutoScroll.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hidePlayables.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.label)}
				onChange={setCheckboxOption("hidePlayables.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideArtificialIntelligenceSummary.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.label)}
				onChange={setCheckboxOption("hideArtificialIntelligenceSummary.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideLiveStreamChat.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.label)}
				onChange={setCheckboxOption("hideLiveStreamChat.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideTranslateComment.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.label)}
				onChange={setCheckboxOption("hideTranslateComment.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideEndScreenCards.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.label)}
				onChange={setCheckboxOption("hideEndScreenCards.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideEndScreenCardsButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.label)}
				onChange={setCheckboxOption("hideEndScreenCardsButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hidePaidPromotionBanner.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label)}
				onChange={setCheckboxOption("hidePaidPromotionBanner.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideOfficialArtistVideosFromHomePage.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.label)}
				onChange={setCheckboxOption("hideOfficialArtistVideosFromHomePage.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyDisableClosedCaptions.enabled?.toString() === "true"}
				disabled={settings.automaticallyEnableClosedCaptions.enabled?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
					OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)
				})}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)}
				onChange={setCheckboxOption("automaticallyDisableClosedCaptions.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyEnableClosedCaptions.enabled?.toString() === "true"}
				disabled={settings.automaticallyDisableClosedCaptions.enabled?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
					OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)
				})}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)}
				onChange={setCheckboxOption("automaticallyEnableClosedCaptions.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hidePlaylistRecommendationsFromHomePage.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.label)}
				onChange={setCheckboxOption("hidePlaylistRecommendationsFromHomePage.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideMembersOnlyVideos.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.label)}
				onChange={setCheckboxOption("hideMembersOnlyVideos.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyDisableAmbientMode.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.label)}
				onChange={setCheckboxOption("automaticallyDisableAmbientMode.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.defaultToOriginalAudioTrack.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.label)}
				onChange={setCheckboxOption("defaultToOriginalAudioTrack.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.restoreFullscreenScrolling.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.label)}
				onChange={setCheckboxOption("restoreFullscreenScrolling.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.saveToWatchLaterButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.label)}
				onChange={setCheckboxOption("saveToWatchLaterButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyShowMoreVideosOnEndScreen.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.label)}
				onChange={setCheckboxOption("automaticallyShowMoreVideosOnEndScreen.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideSidebarRecommendedVideos.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.label)}
				onChange={setCheckboxOption("hideSidebarRecommendedVideos.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.automaticallyDisableAutoPlay.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.label)}
				onChange={setCheckboxOption("automaticallyDisableAutoPlay.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.timestampPeek.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.timestampPeek.enable.label)}
				onChange={setCheckboxOption("timestampPeek.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.timestampPeek.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.blockNumberKeySeeking.enabled}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.label)}
				onChange={setCheckboxOption("blockNumberKeySeeking.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.flipVideoButtons.flipVertical.enabled}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.label)}
				onChange={setCheckboxOption("flipVideoButtons.flipVertical.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.flipVideoButtons.flipHorizontal.enabled}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.label)}
				onChange={setCheckboxOption("flipVideoButtons.flipHorizontal.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.monoToStereoButton.enabled.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.monoToStereoButton.enable.label)}
				onChange={setCheckboxOption("monoToStereoButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.monoToStereoButton.enable.title)}
				type="checkbox"
			/>
		</SettingSection>
	);
}
