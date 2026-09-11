import type { Manifest } from "webextension-polyfill";

import pkg from "../package.json";
import { availableLocales } from "./i18n/constants";
import { DEV_MODE } from "./utils/config/env";
import { YOUTUBE_MATCH_PATTERNS } from "./utils/url/constants";
const permissions: Manifest.Permission[] = ["activeTab", "webRequest", "storage", "tabs", "scripting"];
const hostPermissions: Manifest.MatchPattern[] = YOUTUBE_MATCH_PATTERNS;
const baseResources = [
	"contentStyle.css",
	"/icons/icon_128.png",
	"/icons/icon_48.png",
	"/icons/icon_16.png",
	"src/pages/content/index.js",
	"src/pages/embedded/index.js",
	...availableLocales.map((locale) => `/locales/${locale}.json`)
];
const devtoolsResources =
	DEV_MODE ? ["src/pages/devtools/index.js", "src/pages/devtools/index.css", "src/pages/devtools/panel.js", "src/pages/devtools/panel.html"] : [];
const resources = [...baseResources, ...devtoolsResources];
const icons = {
	"16": "/icons/icon_16.png",
	"19": "/icons/icon_19.png",
	"38": "/icons/icon_38.png",
	"48": "/icons/icon_48.png",
	"128": "/icons/icon_128.png"
};
const action = {
	default_icon: "/icons/icon_48.png",
	default_popup: "src/pages/popup/index.html"
};
const devtoolsPage = DEV_MODE ? { devtools_page: "src/pages/devtools/index.html" } : {};
const manifestV3: Manifest.WebExtensionManifest = {
	action,
	author: pkg.author.name,
	background: {
		service_worker: "src/pages/background/index.js",
		type: "module"
	},
	content_scripts: [
		{
			all_frames: true,
			css: ["contentStyle.css"],
			js: ["src/pages/content/index.js"],
			matches: YOUTUBE_MATCH_PATTERNS,
			run_at: "document_start"
		}
	],
	description: pkg.description,
	host_permissions: hostPermissions,
	icons,
	manifest_version: 3,
	name: pkg.displayName,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	permissions,
	version: pkg.version,
	web_accessible_resources: [
		{
			matches: YOUTUBE_MATCH_PATTERNS,
			resources
		}
	],
	...devtoolsPage
};
const manifestV3Firefox: Manifest.WebExtensionManifest = {
	...manifestV3,
	background: {
		scripts: ["src/pages/background/index.js"]
	},
	browser_specific_settings: {
		gecko: {
			data_collection_permissions: {
				required: ["none"]
			},
			id: "{c49b13b1-5dee-4345-925e-0c793377e3fa}",
			strict_min_version: "109.0"
		}
	}
};

export { manifestV3, manifestV3Firefox };
