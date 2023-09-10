import type { Manifest } from "webextension-polyfill";
import pkg from "../package.json";

const manifestV3: Manifest.WebExtensionManifest = {
	manifest_version: 3,
	name: pkg.displayName,
	version: pkg.version,
	description: pkg.description,
	author: pkg.author.name,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	background: {
		service_worker: "src/pages/background/index.js",
		type: "module"
	},
	action: {
		default_popup: "src/pages/popup/index.html",
		default_icon: "/icons/icon_48.png"
	},
	icons: {
		"16": "/icons/icon_16.png",
		"19": "/icons/icon_19.png",
		"38": "/icons/icon_38.png",
		"48": "/icons/icon_48.png",
		"128": "/icons/icon_128.png"
	},
	permissions: ["activeTab", "webRequest", "storage", "tabs"],
	content_scripts: [
		{
			all_frames: true,
			matches: ["https://www.youtube.com/*"],
			run_at: "document_start",
			js: ["src/pages/inject/index.js"],
			css: ["contentStyle.css"]
		}
	],
	web_accessible_resources: [
		{
			resources: [
				"contentStyle.css",
				"/icons/icon_128.png",
				"/icons/icon_48.png",
				"/icons/icon_16.png",
				"src/pages/content/index.js",
				"src/pages/inject/index.js"
			],
			matches: ["https://www.youtube.com/*"]
		}
	]
};
const manifestV2: Manifest.WebExtensionManifest = {
	manifest_version: 2,
	name: pkg.displayName,
	version: pkg.version,
	description: pkg.description,
	author: pkg.author.name,
	options_ui: {
		page: "src/pages/options/index.html"
	},
	background: {
		scripts: ["src/pages/background/index.js"]
	},
	browser_action: {
		default_popup: "src/pages/popup/index.html",
		default_icon: "/icons/icon_48.png"
	},
	icons: {
		"16": "/icons/icon_16.png",
		"19": "/icons/icon_19.png",
		"38": "/icons/icon_38.png",
		"48": "/icons/icon_48.png",
		"128": "/icons/icon_128.png"
	},
	permissions: ["activeTab", "webRequest", "storage", "tabs"],
	content_scripts: [
		{
			matches: ["https://www.youtube.com/*"],
			js: ["src/pages/inject/index.js"],
			css: ["contentStyle.css"],
			run_at: "document_start"
		}
	],
	web_accessible_resources: [
		"contentStyle.css",
		"/icons/icon_128.png",
		"/icons/icon_48.png",
		"/icons/icon_16.png",
		"src/pages/content/index.js",
		"src/pages/inject/index.js"
	]
};

export { manifestV3, manifestV2 };
