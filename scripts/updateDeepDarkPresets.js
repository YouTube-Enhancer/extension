import fs from "fs/promises";
import https from "https";
import path from "path";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";

import { deepDarkLocalPresets } from "../src/deepDarkLocalPresets.ts";

const SOURCE_URL =
	"https://raw.githubusercontent.com/RaitaroH/YouTube-DeepDark/master/YouTubeDeepDarkMaterial.user.css";

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
	// Hand-maintained presets are merged over upstream themes of the same name, so a
	// regeneration never drops contributor-added presets.
	const localThemes = {};
	for (const [name, css] of Object.entries(deepDarkLocalPresets)) {
		localThemes[name] = cleanThemeBody(css);
	}
	const themes = { ...extractThemes(mozRoot), ...localThemes };
	const presetNames = withLocalPresetNames(Object.keys(deepDarkLocalPresets));
	console.log("Generating TypeScript output...");
	await fs.writeFile(OUTPUT_FILE, buildTS(version, presetNames, themes));
	console.log(`Done! File written: ${OUTPUT_FILE}`);
}

/**
 * Builds a TypeScript module containing the theme presets adapted from "YouTube DeepDark" by RaitaroH.
 * @param {string} version - The version of the theme presets.
 * @param {string[]} presetNames - Every preset name, upstream and hand-maintained, in display order.
 * @param {DeepDarkPresets} themes - The theme presets mapped by name to CSS string.
 * @returns {string} The built TypeScript module as a string.
 */
function buildTS(version, presetNames, themes) {
	const realThemes = presetNames.filter((t) => t !== "Custom");
	const presetArray = presetNames.map((t) => `\t"${t}"`).join(",\n");
	const themeEntries = realThemes
		.map((name, i) => {
			const key = needsQuotes(name) ? `"${name}"` : name;
			const css = themes[name] || ":root {\n\t/* no variables found */\n}";
			const indented = css
				.split("\n")
				.map((l) => "\t" + l)
				.join("\n");
			const comma = i === realThemes.length - 1 ? "" : ",";
			/**
			 * escapeTemplateLiteral keeps backticks and interpolation syntax inside string data,
			 * so a hostile or compromised upstream stylesheet cannot introduce executable code
			 * into the generated module. Clean content keeps the file's existing format.
			 */
			return `\t${key}: \`\n${escapeTemplateLiteral(indented)}\`${comma}`;
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
 * Normalizes a theme body (or a hand-maintained local preset block) the same way: drop comment
 * lines, trim every line, drop empties, and indent one level. Shared by upstream extraction and
 * local presets so both emit in one shape.
 * @param {string} body
 * @returns {string}
 */
function cleanThemeBody(body) {
	return body
		.replace(/^\s*\/\/.*$/gm, "")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => `\t${l}`)
		.join("\n");
}

/**
 * Escapes downloaded CSS so it remains string data inside the generated template literals:
 * backslashes first (so the escapes added here are not processed again), then backticks and
 * "${" sequences. For content without those characters the output is byte-identical to the
 * unescaped format, so regenerating does not rewrite the file.
 * @param {string} value
 * @returns {string}
 */
function escapeTemplateLiteral(value) {
	return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
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
	const opener = /(?:if|else if)\s+stylus-deepdark-style\s*==\s*["'](.+?)["']\s*\{/g;
	let match;
	while ((match = opener.exec(css)) !== null) {
		const name = match[1].trim();
		/**
		 * Same body boundary the lazy regex produced (up to the first "}"), found with indexOf
		 * and a monotonically advancing pointer instead of re-scanning overlapping suffixes, so a
		 * stylesheet full of unterminated openers costs one linear pass rather than quadratic
		 * backtracking.
		 */
		const bodyStart = opener.lastIndex;
		const bodyEnd = css.indexOf("}", bodyStart);
		const body = bodyEnd === -1 ? css.slice(bodyStart) : css.slice(bodyStart, bodyEnd);
		opener.lastIndex = bodyEnd === -1 ? css.length : bodyEnd + 1;
		themes[name] = `:root {\n${cleanThemeBody(body)}\n}`;
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
 * Preset order stays as listed in PRESET_ORDER; hand-maintained local names are slotted in
 * alphabetically, so the generated list stays stable and sorted across regenerations.
 * @param {string[]} localNames
 * @returns {string[]}
 */
function withLocalPresetNames(localNames) {
	const names = [...PRESET_ORDER];
	for (const name of [...localNames].sort()) {
		if (names.includes(name)) continue;
		const at = names.findIndex((existing) => existing > name);
		if (at === -1) names.push(name);
		else names.splice(at, 0, name);
	}
	return names;
}

/**
 * Fetches text from a given url and returns a promise that resolves with the text content.
 * Rejects with an error if the request fails or the response exceeds the size budget.
 * @param {string} url - The url to fetch from.
 * @returns {Promise<string>} - A promise with the text content.
 */
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
function fetchText(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (!res.statusCode || res.statusCode >= 400)
					return reject(new Error(`Request failed: ${res.statusCode}`));
				let data = "";
				res.on("data", (c) => {
					data += c;
					if (data.length > MAX_DOWNLOAD_BYTES) {
						res.destroy();
						return reject(new Error("Response exceeded the download size budget"));
					}
				});
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
