import fs from "fs/promises";
import https from "https";
import path from "path";
import postcss from "postcss";
import safeParser from "postcss-safe-parser";

const SOURCE_URL = "https://raw.githubusercontent.com/RaitaroH/YouTube-DeepDark/master/YouTubeDeepDarkMaterial.user.css";
const OUTPUT_FILE = path.resolve("src/deepDarkMaterialCSS.ts");

/**
 * @typedef {{ name: string, type: string, value: string }} StylusVar
 */

async function build() {
	console.log("Fetching source CSS...");
	const cssRaw = await fetchText(SOURCE_URL);
	console.log("Splitting header and body...");
	const { body, header } = splitUserStyleHeader(cssRaw);
	console.log("Extracting version and variables...");
	const version = extractVersion(header);
	const vars = parseStylusVars(header);
	const checkboxVars = Object.fromEntries(vars.filter(isCheckbox).map((v) => [v.name, v.value.trim()]));
	const valueVars = Object.fromEntries(vars.filter((v) => !isCheckbox(v)).map((v) => [v.name, v.value]));
	console.log("Cleaning CSS and removing Stylus root conditionals...");
	const cleanedCSS = removeStylusRootConditionals(body);
	console.log("Extracting :root and redirect sections from -moz-document...");
	const { mozCSS, redirectCSS } = extractMozSections(cleanedCSS, checkboxVars);
	console.log("Replacing variables and formatting CSS...");
	const finalCSS = formatCSS(replaceVars(`${mozCSS}\n\n${redirectCSS}`, valueVars));
	console.log("Generating TypeScript output...");
	const headerComment = `/**
 * Version ${version}
 * Author: https://github.com/RaitaroH
 * Co-authors: https://github.com/MechaLynx https://github.com/MaximeRF
 * Repository: https://github.com/RaitaroH/YouTube-DeepDark
 */`;
	await fs.writeFile(
		OUTPUT_FILE,
		`/* eslint-disable no-secrets/no-secrets */
${headerComment}
export const deepDarkMaterial = \`
${finalCSS}
\`;
`
	);
	console.log(`Done! File written: ${OUTPUT_FILE}`);
}

/**
 * Extracts Mozilla-specific CSS sections from a given CSS string.
 * Mozilla-specific CSS sections are CSS rules that start with "*:root" and contain an "if" statement.
 * @param {string} css - The CSS string to extract the Mozilla-specific CSS sections from.
 * @param {Object<string, string>} checkboxVars - An object mapping variable names to boolean values.
 * @returns {Object<string, string>} An object with two properties: "mozCSS", which contains the Mozilla-specific CSS sections, and "redirectCSS", which contains the YouTube-specific CSS sections that need to be redirected to "youtube.com/redirect".
 */
function extractMozSections(css, checkboxVars) {
	const root = postcss.parse(css, { parser: safeParser });
	const mozRoot = postcss.root();
	const redirectRoot = postcss.root();
	root.walkAtRules("-moz-document", (rule) => {
		const clone = rule.clone();
		processMozRule(clone, checkboxVars);
		const target = rule.params.includes("youtube.com/redirect") ? redirectRoot : mozRoot;
		target.append(clone.nodes || []);
	});
	return { mozCSS: mozRoot.toString(), redirectCSS: redirectRoot.toString() };
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
	return m[1].trim();
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
 * Formats a given CSS string to be more human-readable.
 * This function takes care of maintaining proper indentation,
 * merging lone "{" with previous selector lines,
 * and normalizing "selector{" to "selector {"
 * @param {string} css - The CSS string to format.
 * @returns {string} The formatted CSS string.
 */
function formatCSS(css) {
	const INDENT = "\t";
	let indent = 0;
	const out = [];
	for (let raw of css.split("\n")) {
		let line = raw.replace(/\r/g, "").trim();
		if (!line) {
			out.push("");
			continue;
		}
		if (line.startsWith("}")) {
			indent = Math.max(indent - 1, 0);
		}
		if (line === "{") {
			if (out.length) {
				out[out.length - 1] = out[out.length - 1].replace(/\s*$/, "") + " {";
				indent++;
			}
			continue;
		}
		if (line.endsWith("{") && !line.endsWith(" {")) {
			line = line.replace(/\{\s*$/, " {");
		}
		out.push(INDENT.repeat(indent) + line);
		if (line.endsWith("{")) {
			indent++;
		}
	}
	return out
		.join("\n")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Checks if a given StylusVar is of type "checkbox".
 * @param {StylusVar} v - The StylusVar to check.
 * @returns {boolean} - True if the var is of type "checkbox", false otherwise.
 */
function isCheckbox(v) {
	return v.type.toLowerCase() === "checkbox";
}

/**
 * Parses a given header string and extracts Stylus variables from it.
 * The variables are extracted from lines starting with "@var" and
 * following the format "@var <type> <name> <value>".
 * @param {string} header - The header string to parse.
 * @returns {StylusVar[]} A list of extracted Stylus variables.
 */
function parseStylusVars(header) {
	const vars = [];
	const regex = /^@var\s+(\S+)\s+(\S+)\s+["'][^"']*["']\s+(.+)$/gm;
	let m;
	while ((m = regex.exec(header))) {
		vars.push({
			name: m[2],
			type: m[1],
			value: m[3].trim().replace(/^['"]|['"]$/g, "")
		});
	}
	return vars;
}

/**
 * Removes stylus-only constructs and resolves checkbox conditionals
 * @param {import("postcss").Container} rule
 * @param {Record<string,string>} checkboxVars
 */
function processMozRule(rule, checkboxVars) {
	rule.walk((node) => {
		if (node.type === "comment" && node.text.trim() === "Main color variables") node.remove();
		if (node.type === "rule" && node.selector === ":root" && node.nodes?.every((n) => n.type === "decl" && n.prop.startsWith("--"))) {
			node.remove();
		}
	});
	rule.walkRules((r) => {
		const sel = r.selector?.trim();
		if (!sel?.startsWith("if ")) return;
		const varName = sel
			.slice(3)
			.split(/\s|\/\*/)[0]
			.trim();
		const value = checkboxVars[varName];
		const elseRule = r.next();
		const hasElse = elseRule?.type === "rule" && elseRule.selector?.trim().startsWith("else");
		if (value === "1") {
			r.replaceWith(...(r.nodes || []));
			if (hasElse) elseRule.remove();
		} else if (value === "0") {
			if (hasElse) elseRule.replaceWith(...(elseRule.nodes || []));
			r.remove();
		} else {
			r.remove();
			if (hasElse) elseRule.remove();
		}
	});
}

/**
 * Removes Stylus root conditionals from a given CSS string.
 * Stylus root conditionals are CSS rules that start with "*:root" and contain an "if" statement.
 * @param {string} css - The CSS string to remove the Stylus root conditionals from.
 * @returns {string} The CSS string with the Stylus root conditionals removed.
 */
function removeStylusRootConditionals(css) {
	return css.replace(/^\s*:root\s*\{[^}]*if\s+[\s\S]*?}\s*}/gm, "").trim();
}

/**
 * Replaces variables in a CSS string with their corresponding values.
 * @param {string} css - CSS string to replace variables in
 * @param {Record<string,string>} vars - Object with variable names as keys and their values as values
 * @returns {string} CSS string with variables replaced
 */
function replaceVars(css, vars) {
	for (const [name, value] of Object.entries(vars)) {
		css = css.replace(new RegExp(`\\b${name}\\b`, "g"), value);
	}
	return css;
}

/**
 * Splits a given CSS string into two parts: the "header" part,
 * which contains the UserStyle header comments, and the "body" part,
 * which contains the rest of the CSS rules.
 * @returns {{ body: string, header: string }}
 */
function splitUserStyleHeader(css) {
	const m = css.match(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//i);
	return m ? { body: css.slice(m.index + m[0].length).trimStart(), header: m[0] } : { body: css, header: "" };
}

build().catch((e) => {
	console.error("Build failed:", e);
	process.exit(1);
});
