import type { PluginOption } from "vite";

import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

import pkg from "../../../package.json";
import terminalColorLog from "../log";
import { browsers, outDir } from "./utils";

const releaseDir = resolve(__dirname, "..", "..", "..", "releases");

export default function makeReleaseZips(): PluginOption {
	return {
		closeBundle() {
			for (const browser of browsers) {
				if (!existsSync(resolve(releaseDir, browser.name))) {
					mkdirSync(resolve(releaseDir, browser.name), { recursive: true });
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
