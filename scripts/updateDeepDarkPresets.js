import fs from "fs/promises";
import https from "https";
import path from "path";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";

const SOURCE_URL = "https://raw.githubusercontent.com/RaitaroH/YouTube-DeepDark/master/YouTubeDeepDarkMaterial.user.css";

const OUTPUT_FILE = path.resolve("src/deepDarkPresets.ts");

const PRESET_ORDER = [
	"9anime",
	"Adapta-Breath-Nokto",
	"Adapta-Nokto",
	"Arc-Dark",
	"Black-and-White",
	"Breeze-Dark",
	"Custom",
	"Deep-Dark",
	"Discord",
	"Dracula",
	"Firefox-57",
	"Firefox-Alpenglow-Dark",
	"Firefox-Dark",
	"Firefox-Dark-91",
	"Gruvbox-Dark",
	"Gruvbox-Light",
	"HavocOS",
	"Inspired-Dark",
	"Jisho",
	"Mint-Y-Dark",
	"NierAutomata-Dark",
	"NierAutomata-Light",
	"Orange",
	"Solarized-Dark",
	"Solarized-Light",
	"Ubuntu-Grey",
	"Ubuntu-Purple",
	"Vertex-Dark",
	"Yellow",
	"Yellow-2",
	"YouTube-Dark"
];

async function build() {
	console.log("Fetching source CSS...");
	const raw = await fetchText(SOURCE_URL);
	const { body, header } = splitHeader(raw);
	const version = extractVersion(header);
	console.log("Extracting :root from @-moz-document...");
	const mozRoot = extractMozRoot(body);
	console.log("Extracting theme blocks...");
	const themes = extractThemes(mozRoot);
	console.log("Generating TypeScript output...");
	await fs.writeFile(OUTPUT_FILE, buildTS(version, themes));
	console.log(`Done! File written: ${OUTPUT_FILE}`);
}

/**
 * Builds a TypeScript module containing the theme presets adapted from "YouTube DeepDark" by RaitaroH.
 * @param {string} version - The version of the theme presets.
 * @param {DeepDarkPresets} themes - The theme presets mapped by name to CSS string.
 * @returns {string} The built TypeScript module as a string.
 */
function buildTS(version, themes) {
	const realThemes = PRESET_ORDER.filter((t) => t !== "Custom");
	const presetArray = PRESET_ORDER.map((t) => `\t"${t}"`).join(",\n");
	const themeEntries = realThemes
		.map((name, i) => {
			const key = needsQuotes(name) ? `"${name}"` : name;
			const css = themes[name] || ":root {\n\t/* no variables found */\n}";
			const indented = css
				.split("\n")
				.map((l) => "\t" + l)
				.join("\n");
			const comma = i === realThemes.length - 1 ? "" : ",";
			return `\t${key}: \`\n${indented}\`${comma}`;
		})
		.join("\n");
	return `/**
 * Theme presets are adapted from the "YouTube DeepDark" Stylus theme by RaitaroH.
 * Author: https://github.com/RaitaroH
 * Co-authors: https://github.com/MechaLynx
 * Repository: https://github.com/RaitaroH/YouTube-DeepDark
 * Version: ${version}
 */
export const deepDarkPreset = [
${presetArray}
] as const;
export type DeepDarkPreset = (typeof deepDarkPreset)[number];
export type DeepDarkPresets = Record<Exclude<DeepDarkPreset, "Custom">, string>;
/**
 * Theme presets are adapted from the "YouTube DeepDark" Stylus theme by RaitaroH.
 * Author: RaitaroH
 * Co-authors: https://github.com/MechaLynx
 * Repository: https://github.com/RaitaroH/YouTube-DeepDark
 */
export const deepDarkPresets = {
${themeEntries}
} as const satisfies DeepDarkPresets;
`;
}

/**
 * Extracts the contents of the `:root` block from a given CSS string, as long as it is contained within an `@-moz-document` block.
 * @param {string} css - The CSS string to extract the `:root` block from.
 * @returns {string} The extracted `:root` block contents.
 */
function extractMozRoot(css) {
	const root = postcss.parse(css, { parser: safeParser });
	let rootContent = "";
	root.walkAtRules("-moz-document", (rule) => {
		rule.walkRules(":root", (rootRule) => {
			rootContent = rootRule.nodes.map((decl) => decl.toString()).join("\n");
		});
	});
	return rootContent;
}

/**
 * Extracts themes from a given CSS string.
 * A theme is defined as a CSS block that matches the following regex:
 * (?:if|else if)\s+stylus-deepdark-style\s*==\s*["'](.+?)["']\s*\{([\s\S]*?)\}
 * The function will return an object where the key is the theme name, and the value is the extracted CSS block.
 * The extracted CSS block will be cleaned up by removing any URLs that start with "//", and removing any whitespace or empty lines.
 * The extracted CSS block will also be indented with a single tab character.
 * @param {string} css - The CSS string to extract themes from.
 * @returns {Object<string, string>} An object where the key is the theme name, and the value is the extracted CSS block.
 */
function extractThemes(css) {
	const themes = {};
	const re = /(?:if|else if)\s+stylus-deepdark-style\s*==\s*["'](.+?)["']\s*\{([\s\S]*?)\}/g;
	for (const match of css.matchAll(re)) {
		const name = match[1].trim();
		const cleaned = match[2]
			.replace(/^\s*\/\/.*$/gm, "")
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
			.map((l) => `\t${l}`)
			.join("\n");
		themes[name] = `:root {\n${cleaned}\n}`;
	}
	return themes;
}

/**
 * Extracts the version from a given header string.
 * @throws {Error} If the "@version" string is not found in the header.
 * @param {string} header - The header string to extract the version from.
 * @returns {string} The extracted version string.
 */
function extractVersion(header) {
	const m = header.match(/^@version\s+([\d.]+)/m);
	if (!m) throw new Error("@version not found");
	return m[1];
}

/**
 * Fetches text from a given url and returns a promise that resolves with the text content.
 * Rejects with an error if the request fails.
 * @param {string} url - The url to fetch from.
 * @returns {Promise<string>} - A promise with the text content.
 */
function fetchText(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (!res.statusCode || res.statusCode >= 400) return reject(new Error(`Request failed: ${res.statusCode}`));
				let data = "";
				res.on("data", (c) => (data += c));
				res.on("end", () => resolve(data));
			})
			.on("error", reject);
	});
}

/**
 * Checks if a given CSS key name needs to be surrounded by quotes.
 * The CSS spec requires that any key name that contains special characters
 * must be surrounded by quotes. This function checks if a given key name
 * matches that requirement.
 * @param {string} key - The CSS key name to check.
 * @returns {boolean} True if the key name needs to be surrounded by quotes, false otherwise.
 */
function needsQuotes(key) {
	return !/^[$A-Z_][0-9A-Z_$]*$/i.test(key);
}

/**
 * Splits a given CSS string into two parts: the "header" part,
 * which contains the UserStyle header comments, and the "body" part,
 * which contains the rest of the CSS rules.
 * @param {string} css - The CSS string to split.
 * @returns {{ body: string, header: string }}
 */
function splitHeader(css) {
	const match = css.match(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//i);
	if (!match) return { body: css, header: "" };
	return {
		body: css.slice(match.index + match[0].length).trimStart(),
		header: match[0]
	};
}

build().catch((err) => {
	console.error("Build failed:", err);
	process.exit(1);
});
