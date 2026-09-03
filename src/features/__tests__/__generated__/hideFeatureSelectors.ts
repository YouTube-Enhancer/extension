// Auto-generated. Do not edit manually.
export const hideFeatureSelectors = {
	hideArtificialIntelligence: {
		bodyClass: "yte-hide-ai",
		selectors: [
			"#expandable-metadata [has-video-summary]",
			"div#video-summary [has-video-summary]",
			"yt-button-view-model .you-chat-entrypoint-button",
			"yt-player-quick-action-buttons .you-chat-entrypoint-button",
			'ytd-engagement-panel-section-list-renderer[target-id="PAyouchat"]',
			'button-view-model:has( svg path[d="M19 0a5 5 0 01-5 5 5 5 0 015 5 5 5 0 015-5 5 5 0 01-5-5Zm-8 2a9 9 0 105.641 16.013c.044.07.094.135.152.194l3.5 3.5a1 1 0 001.414-1.414l-3.5-3.5a1.001 1.001 0 00-.194-.152A8.96 8.96 0 0019.945 12H17.93a7 7 0 11-5.99-7.938l1.675-1.676A9 9 0 0011 2Z"] )',
			".ytSearchboxComponentReportButton",
			".ytSearchboxComponentAiSuggestionsContainer",
			"yt-video-description-youchat-section-view-model",
			"ytd-live-chat-frame yt-live-chat-banner-renderer",
			'ytd-live-chat-frame [class*="ai-summary"]',
			'ytd-live-chat-frame [class*="generative"]',
			'ytd-live-chat-frame ytd-engagement-panel-section-list-renderer[target-id="PAyouchat"]'
		]
	},
	hideEndScreenCards: { bodyClass: "yte-hide-end-screen-cards", selectors: [".ytp-ce-element", ".ytp-ce-hide-button-container"] },
	hideLiveStreamChat: {
		bodyClass: "yte-hide-live-stream-chat",
		selectors: [
			"div#chat-container",
			"div#chat-container-live-stream-chat",
			"#full-bleed-chat-container #panels-full-bleed-container",
			"#full-bleed-container #panels-full-bleed-container",
			"ytd-live-chat-frame"
		]
	},
	hideMembersOnlyVideos: {
		bodyClass: "yte-hide-members-only-videos:not(:has(yt-sponsorships-hub))",
		selectors: [
			'ytd-rich-item-renderer:has( path[d="M6 .5a5.5 5.5 0 100 11 5.5 5.5 0 000-11Zm.27 2.045.906 1.837 2.027.295a.3.3 0 01.166.511l-1.467 1.43.346 2.019a.3.3 0 01-.435.316L6 8l-1.813.953a.3.3 0 01-.435-.316l.346-2.019-1.467-1.43a.3.3 0 01.166-.511l2.027-.295.907-1.837a.3.3 0 01.539 0Z"] )',
			'ytd-item-section-renderer yt-horizontal-list-renderer:has( path[d="M6 .5a5.5 5.5 0 100 11 5.5 5.5 0 000-11Zm.27 2.045.906 1.837 2.027.295a.3.3 0 01.166.511l-1.467 1.43.346 2.019a.3.3 0 01-.435.316L6 8l-1.813.953a.3.3 0 01-.435-.316l.346-2.019-1.467-1.43a.3.3 0 01.166-.511l2.027-.295.907-1.837a.3.3 0 01.539 0Z"] )',
			'yt-lockup-view-model:has( path[d="M6 .5a5.5 5.5 0 100 11 5.5 5.5 0 000-11Zm.27 2.045.906 1.837 2.027.295a.3.3 0 01.166.511l-1.467 1.43.346 2.019a.3.3 0 01-.435.316L6 8l-1.813.953a.3.3 0 01-.435-.316l.346-2.019-1.467-1.43a.3.3 0 01.166-.511l2.027-.295.907-1.837a.3.3 0 01.539 0Z"] )'
		]
	},
	hideOfficialArtistVideosFromHomePage: {
		bodyClass: "yte-hide-official-artist-videos-from-home-page",
		selectors: [
			'ytd-rich-item-renderer:has( path[d="M9.03 2.242 8.272 3H7.2A4.2 4.2 0 003 7.2v1.072l-.758.758a4.2 4.2 0 000 5.94l.758.758V16.8A4.2 4.2 0 007.2 21h1.072l.758.758a4.2 4.2 0 005.94 0l.758-.758H16.8a4.2 4.2 0 004.2-4.2v-1.072l.758-.758a4.2 4.2 0 000-5.94L21 8.272V7.2A4.2 4.2 0 0016.8 3h-1.072l-.758-.758a4.2 4.2 0 00-5.94 0Zm7.73 6.638a.5.5 0 01.241.427v1.743a.256.256 0 01-.386.219L14.001 9.7v4.55a2.75 2.75 0 11-2-2.646V6.888a.5.5 0 01.759-.428l4 2.42Z"] )'
		]
	},
	hidePaidPromotionBanner: {
		bodyClass: "yte-hide-paid-promotion-banner",
		selectors: [".ytp-paid-content-overlay", "ytm-paid-content-overlay-renderer"]
	},
	hidePlayables: { bodyClass: "yte-hide-playables", selectors: ['ytd-rich-section-renderer:has(a[href="/playables"])'] },
	hidePlaylistRecommendationsFromHomePage: {
		bodyClass: "yte-hide-playlist-recommendations-from-home-page",
		selectors: ['ytd-browse[page-subtype="home"] ytd-rich-item-renderer:has(yt-collection-thumbnail-view-model)']
	},
	hidePosts: { bodyClass: "yte-hide-posts", selectors: ["ytd-rich-section-renderer:has([is-post])"] },
	hideShortsChannel: {
		bodyClass: "yte-hide-shorts-channel",
		selectors: [
			'ytd-item-section-renderer[page-subtype="channels"] ytd-reel-shelf-renderer:has(#title-container)',
			'yt-tab-shape[tab-title="Shorts"]'
		]
	},
	hideShortsHome: { bodyClass: "yte-hide-shorts-home", selectors: ['ytd-browse[page-subtype="home"] ytd-rich-section-renderer:has([is-shorts])'] },
	hideShortsSearch: {
		bodyClass: "yte-hide-shorts-search",
		selectors: [
			'grid-shelf-view-model:has( [d="m19.45,3.88c1.12,1.82.48,4.15-1.42,5.22l-1.32.74.94.41c1.36.58,2.27,1.85,2.35,3.27.08,1.43-.68,2.77-1.97,3.49l-8,4.47c-1.91,1.06-4.35.46-5.48-1.35-1.12-1.82-.48-4.15,1.42-5.22l1.33-.74-.94-.41c-1.36-.58-2.27-1.85-2.35-3.27-.08-1.43.68-2.77,1.97-3.49l8-4.47c1.91-1.06,4.35-.46,5.48,1.35Z"] )',
			'ytd-video-renderer[is-search]:has([overlay-style="SHORTS"])'
		]
	},
	hideShortsSidebar: {
		bodyClass: "yte-hide-shorts-sidebar",
		selectors: ['ytd-guide-entry-renderer:has(a[title="Shorts"])', 'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])']
	},
	hideShortsSubscriptions: {
		bodyClass: "yte-hide-shorts-subscriptions",
		selectors: ['ytd-browse[page-subtype="subscriptions"] ytd-rich-section-renderer:has([is-shorts])']
	},
	hideShortsVideos: {
		bodyClass: "yte-hide-shorts-videos",
		selectors: [
			'ytd-video-renderer:not([is-search]):has([overlay-style="SHORTS"])',
			"ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer:has(#title-container)"
		]
	},
	hideSidebarRecommendedVideos: { bodyClass: "yte-hide-sidebar-recommended-videos", selectors: ["#secondary #secondary-inner #related"] },
	hideTranslateComment: { bodyClass: "yte-hide-translate-comment", selectors: ["ytd-tri-state-button-view-model.translate-button"] }
} as const;
