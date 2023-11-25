import type { PluginOption } from "vite";

import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { resolve } from "path";

import pkg from "../../../package.json";
import { outputFolderName } from "../constants";
import terminalColorLog from "../log";

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
const releaseDir = resolve(__dirname, "..", "..", "..", "releases");

export default function makeReleaseZips(): PluginOption {
	return {
		closeBundle() {
			if (!existsSync(releaseDir)) {
				mkdirSync(releaseDir);
			}
			const browsers = GetInstalledBrowsers();
			for (const browser of browsers) {
				if (!existsSync(resolve(releaseDir, browser.name))) {
					mkdirSync(resolve(releaseDir, browser.name));
				}
				const releaseZipPath = resolve(releaseDir, browser.name, `${pkg.name}-v${pkg.version}-${browser.name}.zip`);
				const releaseZipStream = createWriteStream(releaseZipPath);
				const releaseZip = archiver("zip", {
					zlib: {
						level: 9
					}
				});
				releaseZip.pipe(releaseZipStream);
				releaseZip.directory(resolve(outDir, browser.name), false);

				releaseZipStream.on("close", () => {
					terminalColorLog(`Release zip file created: ${releaseZipPath}`, "success");
				});
				void releaseZip.finalize();
			}
		},

		name: "make-release-zips"
	};
}
