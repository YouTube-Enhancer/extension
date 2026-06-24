import { createFeature } from "@/src/features/_registry/createFeature";
import { applyShortsVisibility } from "@/src/features/hideShorts/utils";

import "./index.css";
import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onConfigChange: ({
		channel: { enabled: channel },
		home: { enabled: home },
		search: { enabled: search },
		sidebar: { enabled: sidebar },
		subscriptions: { enabled: subscriptions },
		videos: { enabled: videos }
	}) => {
		applyShortsVisibility({
			channel,
			home,
			search,
			sidebar,
			subscriptions,
			videos
		});
	},
	onDisable: () => {
		applyShortsVisibility({
			channel: false,
			home: false,
			search: false,
			sidebar: false,
			subscriptions: false,
			videos: false
		});
	},
	onEnable: ({
		channel: { enabled: channel },
		home: { enabled: home },
		search: { enabled: search },
		sidebar: { enabled: sidebar },
		subscriptions: { enabled: subscriptions },
		videos: { enabled: videos }
	}) => {
		applyShortsVisibility({
			channel,
			home,
			search,
			sidebar,
			subscriptions,
			videos
		});
	},
	onNavigate: ({
		channel: { enabled: channel },
		home: { enabled: home },
		search: { enabled: search },
		sidebar: { enabled: sidebar },
		subscriptions: { enabled: subscriptions },
		videos: { enabled: videos }
	}) => {
		applyShortsVisibility({
			channel,
			home,
			search,
			sidebar,
			subscriptions,
			videos
		});
	}
});
