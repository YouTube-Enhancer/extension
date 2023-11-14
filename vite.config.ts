import react from "@vitejs/plugin-react-swc";
import { existsSync, readdirSync, rmSync, statSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

import { outputFolderName } from "./src/utils/constants";
import buildContentScript from "./src/utils/plugins/build-content-script";
import copyBuild from "./src/utils/plugins/copy-build";
import copyPublic from "./src/utils/plugins/copy-public";
import makeManifest from "./src/utils/plugins/make-manifest";
import makeReleaseZips from "./src/utils/plugins/make-release-zips";

const root = resolve(__dirname, "src");
const pagesDir = resolve(root, "pages");
const assetsDir = resolve(root, "assets");
const componentsDir = resolve(root, "components");
const utilsDir = resolve(root, "utils");
const hooksDir = resolve(root, "hooks");
const outDir = resolve(__dirname, outputFolderName);
const emptyOutputFolder = () => {
	if (!existsSync(outDir)) return;
	const files = readdirSync(outDir);
	for (const file of files) {
		if (file.endsWith(".zip")) continue;
		const filePath = resolve(outDir, file);
		const fileStat = statSync(filePath);
		if (fileStat.isDirectory()) {
			rmSync(filePath, { recursive: true });
		} else {
			rmSync(filePath);
		}
	}
};
export default function build() {
	emptyOutputFolder();
	return defineConfig({
		build: {
			emptyOutDir: false,
			outDir: resolve(outDir, "temp"),
			rollupOptions: {
				input: {
					background: resolve(pagesDir, "background", "index.ts"),
					options: resolve(pagesDir, "options", "index.html"),
					popup: resolve(pagesDir, "popup", "index.html")
				},
				output: {
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
					}
				}
			},
			sourcemap: process.env.__DEV__ === "true" ? "inline" : false
		},
		plugins: [react(), makeManifest(), buildContentScript(), copyPublic(), copyBuild(), makeReleaseZips()],
		resolve: {
			alias: {
				"@/assets": assetsDir,
				"@/components": componentsDir,
				"@/hooks": hooksDir,
				"@/pages": pagesDir,
				"@/src": root,
				"@/utils": utilsDir
			}
		}
	});
}
