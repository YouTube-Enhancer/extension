import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";
import makeManifest from "./src/utils/plugins/make-manifest";
import buildContentScript from "./src/utils/plugins/build-content-script";
import { outputFolderName } from "./src/utils/constants";
import { existsSync, readdirSync, rmSync, statSync } from "fs";

const root = resolve(__dirname, "src");
const pagesDir = resolve(root, "pages");
const assetsDir = resolve(root, "assets");
const componentsDir = resolve(root, "components");
const utilsDir = resolve(root, "utils");
const hooksDir = resolve(root, "hooks");
const outDir = resolve(__dirname, outputFolderName);
const publicDir = resolve(__dirname, "public");
// Make a function to delete the output folder before building
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
		resolve: {
			alias: {
				"@/src": root,
				"@/assets": assetsDir,
				"@/pages": pagesDir,
				"@/components": componentsDir,
				"@/utils": utilsDir,
				"@/hooks": hooksDir
			}
		},
		plugins: [react(), makeManifest(), buildContentScript()],
		publicDir,
		build: {
			outDir,
			sourcemap: process.env.__DEV__ === "true",
			emptyOutDir: false,
			rollupOptions: {
				input: {
					background: resolve(pagesDir, "background", "index.ts"),
					popup: resolve(pagesDir, "popup", "index.html"),
					options: resolve(pagesDir, "options", "index.html")
				},
				output: {
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
					}
				}
			}
		}
	});
}
