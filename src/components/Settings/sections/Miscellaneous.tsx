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
				checked={settings.enable_global_volume?.toString() !== "true" && settings.enable_remember_last_volume?.toString() === "true"}
				disabled={settings.enable_global_volume?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.extras.optionDisabled.specificOption.rememberVolume)}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.label)}
				onChange={setCheckboxOption("enable_remember_last_volume")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_maximize_player_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.label)}
				onChange={setCheckboxOption("enable_maximize_player_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_maximize_player.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.label)}
				onChange={setCheckboxOption("enable_automatically_maximize_player")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_remaining_time?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.label)}
				onChange={setCheckboxOption("enable_remaining_time")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_pausing_background_players?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.label)}
				onChange={setCheckboxOption("enable_pausing_background_players")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_loop_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.label)}
				onChange={setCheckboxOption("enable_loop_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_copy_timestamp_url_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.label)}
				onChange={setCheckboxOption("enable_copy_timestamp_url_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_scrollbar?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.label)}
				onChange={setCheckboxOption("enable_hide_scrollbar")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatic_theater_mode?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.label)}
				onChange={setCheckboxOption("enable_automatic_theater_mode")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_open_transcript_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.label)}
				onChange={setCheckboxOption("enable_open_transcript_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_open_youtube_settings_on_hover?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.label)}
				onChange={setCheckboxOption("enable_open_youtube_settings_on_hover")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_redirect_remover?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.label)}
				onChange={setCheckboxOption("enable_redirect_remover")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_share_shortener?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.label)}
				onChange={setCheckboxOption("enable_share_shortener")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_skip_continue_watching?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.label)}
				onChange={setCheckboxOption("enable_skip_continue_watching")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_shorts_auto_scroll?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.label)}
				onChange={setCheckboxOption("enable_shorts_auto_scroll")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_shorts?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideShorts.enable.label)}
				onChange={setCheckboxOption("enable_hide_shorts")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideShorts.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_playables?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.label)}
				onChange={setCheckboxOption("enable_hide_playables")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_artificial_intelligence_summary?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.label)}
				onChange={setCheckboxOption("enable_hide_artificial_intelligence_summary")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_live_stream_chat?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.label)}
				onChange={setCheckboxOption("enable_hide_live_stream_chat")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_translate_comment?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.label)}
				onChange={setCheckboxOption("enable_hide_translate_comment")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_end_screen_cards?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.label)}
				onChange={setCheckboxOption("enable_hide_end_screen_cards")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_end_screen_cards_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.label)}
				onChange={setCheckboxOption("enable_hide_end_screen_cards_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_paid_promotion_banner?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label)}
				onChange={setCheckboxOption("enable_hide_paid_promotion_banner")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_official_artist_videos_from_home_page?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.label)}
				onChange={setCheckboxOption("enable_hide_official_artist_videos_from_home_page")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_disable_closed_captions?.toString() === "true"}
				disabled={settings.enable_automatically_enable_closed_captions?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
					OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)
				})}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)}
				onChange={setCheckboxOption("enable_automatically_disable_closed_captions")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_enable_closed_captions?.toString() === "true"}
				disabled={settings.enable_automatically_disable_closed_captions?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
					OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)
				})}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)}
				onChange={setCheckboxOption("enable_automatically_enable_closed_captions")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_playlist_recommendations_from_home_page?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.label)}
				onChange={setCheckboxOption("enable_hide_playlist_recommendations_from_home_page")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_members_only_videos?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.label)}
				onChange={setCheckboxOption("enable_hide_members_only_videos")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_disable_ambient_mode?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.label)}
				onChange={setCheckboxOption("enable_automatically_disable_ambient_mode")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_default_to_original_audio_track?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.label)}
				onChange={setCheckboxOption("enable_default_to_original_audio_track")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_restore_fullscreen_scrolling?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.label)}
				onChange={setCheckboxOption("enable_restore_fullscreen_scrolling")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_save_to_watch_later_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.label)}
				onChange={setCheckboxOption("enable_save_to_watch_later_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_show_more_videos_on_end_screen?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.label)}
				onChange={setCheckboxOption("enable_automatically_show_more_videos_on_end_screen")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_sidebar_recommended_videos?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.label)}
				onChange={setCheckboxOption("enable_hide_sidebar_recommended_videos")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_automatically_disable_autoplay?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.label)}
				onChange={setCheckboxOption("enable_automatically_disable_autoplay")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_timestamp_peek?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.timestampPeek.enable.label)}
				onChange={setCheckboxOption("enable_timestamp_peek")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.timestampPeek.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_block_number_key_seeking}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.label)}
				onChange={setCheckboxOption("enable_block_number_key_seeking")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_flip_video_vertical_button}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.label)}
				onChange={setCheckboxOption("enable_flip_video_vertical_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_flip_video_horizontal_button}
				label={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.label)}
				onChange={setCheckboxOption("enable_flip_video_horizontal_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.title)}
				type="checkbox"
			/>
		</SettingSection>
	);
}
