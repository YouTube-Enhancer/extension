import * as fs from "fs";
import * as path from "path";
import colorLog from "../log";
import pkg from "../../../package.json";
import { PluginOption } from "vite";
import archiver from "archiver";
import { outputFolderName } from "../constants";

const { resolve } = path;

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
const releaseDir = resolve(__dirname, "..", "..", "..", "releases");

export default function makeReleaseZip(): PluginOption {
	return {
		name: "make-release-zip",

		closeBundle() {
			if (!fs.existsSync(releaseDir)) {
				fs.mkdirSync(releaseDir);
			}
			const releaseZipPath = resolve(releaseDir, `${pkg.name}-v${pkg.version}.zip`);
			const releaseZipStream = fs.createWriteStream(releaseZipPath);
			const releaseZip = archiver("zip", {
				zlib: {
					level: 9
				}
			});
			releaseZip.pipe(releaseZipStream);
			releaseZip.directory(outDir, false);

			releaseZipStream.on("close", () => {
				colorLog(`Release zip file created: ${releaseZipPath}`, "success");
			});
			releaseZip.finalize();
		}
	};
}
