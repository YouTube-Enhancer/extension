import type { Manifest } from "webextension-polyfill";

import pkg from "../package.json";
import { availableLocales } from "./i18n";
const permissions: Manifest.Permission[] = ["activeTab", "webRequest", "storage", "tabs", "scripting"];
const hostPermissions: Manifest.MatchPattern[] = ["https://www.youtube.com/*"];
const resources = [
	"contentStyle.css",
	"/icons/icon_128.png",
	"/icons/icon_48.png",
	"/icons/icon_16.png",
	"src/pages/content/index.js",
	"src/pages/embedded/index.js",
	...availableLocales.map((locale) => `/locales/${locale}.json`)
];
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
			matches: ["https://www.youtube.com/*"],
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
			matches: ["https://www.youtube.com/*"],
			resources
		}
	]
};
const manifestV2: Manifest.WebExtensionManifest = {
	author: pkg.author.name,
	background: {
		page: "src/pages/background/index.html"
	},
	browser_action: action,
	browser_specific_settings: {
		gecko: {
			id: "{c49b13b1-5dee-4345-925e-0c793377e3fa}"
		}
	},
	content_scripts: [
		{
			css: ["contentStyle.css"],
			js: ["src/pages/content/index.js"],
			matches: ["https://www.youtube.com/*"],
			run_at: "document_start"
		}
	],
	description: pkg.description,
	icons,
	manifest_version: 2,
	name: pkg.displayName,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	permissions: permissions.concat(hostPermissions),
	version: pkg.version,
	web_accessible_resources: resources
};

export { manifestV2, manifestV3 };
