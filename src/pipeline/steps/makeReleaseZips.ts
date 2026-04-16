import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

import pkg from "../../../package.json";
import { browsers, outDir } from "../../utils/plugins/utils";

const releaseDir = resolve(process.cwd(), "releases");

export async function makeReleaseZips(): Promise<void> {
	await Promise.all(
		browsers.map(async (browser) => {
			const browserReleaseDir = resolve(releaseDir, browser.name);

			if (!existsSync(browserReleaseDir)) {
				mkdirSync(browserReleaseDir, { recursive: true });
			}

			const releaseZipPath = resolve(browserReleaseDir, `${pkg.name}-v${pkg.version}-${browser.name}.zip`);

			const releaseZipStream = createWriteStream(releaseZipPath);

			const releaseZip = archiver("zip", {
				zlib: { level: 9 }
			});

			releaseZip.pipe(releaseZipStream);
			releaseZip.directory(resolve(outDir, browser.name), false);

			await releaseZip.finalize();
		})
	);
}
