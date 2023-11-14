import type { Manifest } from "webextension-polyfill";

import pkg from "../package.json";
import { availableLocales } from "./i18n";

const manifestV3: Manifest.WebExtensionManifest = {
	action: {
		default_icon: "/icons/icon_48.png",
		default_popup: "src/pages/popup/index.html"
	},
	author: pkg.author.name,
	background: {
		service_worker: "src/pages/background/index.js",
		type: "module"
	},
	content_scripts: [
		{
			all_frames: true,
			css: ["contentStyle.css"],
			js: ["src/pages/inject/index.js"],
			matches: ["https://www.youtube.com/*"],
			run_at: "document_start"
		}
	],
	description: pkg.description,
	icons: {
		"16": "/icons/icon_16.png",
		"19": "/icons/icon_19.png",
		"38": "/icons/icon_38.png",
		"48": "/icons/icon_48.png",
		"128": "/icons/icon_128.png"
	},
	manifest_version: 3,
	name: pkg.displayName,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	permissions: ["activeTab", "webRequest", "storage", "tabs"],
	version: pkg.version,
	web_accessible_resources: [
		{
			matches: ["https://www.youtube.com/*"],
			resources: [
				"contentStyle.css",
				"/icons/icon_128.png",
				"/icons/icon_48.png",
				"/icons/icon_16.png",
				"src/pages/content/index.js",
				"src/pages/inject/index.js",
				...availableLocales.map((locale) => `/locales/${locale}.json`)
			]
		}
	]
};
const manifestV2: Manifest.WebExtensionManifest = {
	author: pkg.author.name,
	background: {
		scripts: ["src/pages/background/index.js"]
	},
	browser_action: {
		default_icon: "/icons/icon_48.png",
		default_popup: "src/pages/popup/index.html"
	},
	browser_specific_settings: {
		gecko: {
			id: "{c49b13b1-5dee-4345-925e-0c793377e3fa}",
			strict_min_version: "119.0"
		}
	},
	content_scripts: [
		{
			css: ["contentStyle.css"],
			js: ["src/pages/inject/index.js"],
			matches: ["https://www.youtube.com/*"],
			run_at: "document_start"
		}
	],
	description: pkg.description,
	icons: {
		"16": "/icons/icon_16.png",
		"19": "/icons/icon_19.png",
		"38": "/icons/icon_38.png",
		"48": "/icons/icon_48.png",
		"128": "/icons/icon_128.png"
	},
	manifest_version: 2,
	name: pkg.displayName,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	permissions: ["activeTab", "webRequest", "storage", "tabs"],
	version: pkg.version,
	web_accessible_resources: [
		"contentStyle.css",
		"/icons/icon_128.png",
		"/icons/icon_48.png",
		"/icons/icon_16.png",
		"src/pages/content/index.js",
		"src/pages/inject/index.js",
		...availableLocales.map((locale) => `/locales/${locale}.json`)
	]
};

export { manifestV2, manifestV3 };
