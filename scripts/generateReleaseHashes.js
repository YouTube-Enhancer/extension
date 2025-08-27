#!/usr/bin/env node
import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
const directory = "releases";

console.log("## Release Artifacts");
console.log("| File Name | SHA-256 Hash |");
console.log("| :--- | :---: |");

if (existsSync(directory)) {
	const subdirectories = readdirSync(directory);

	for (const sub of subdirectories) {
		const subPath = join(directory, sub);
		if (statSync(subPath).isDirectory()) {
			const files = readdirSync(subPath);

			for (const file of files) {
				const filePath = join(subPath, file);
				if (statSync(filePath).isFile()) {
					const buffer = readFileSync(filePath);
					const hash = createHash("sha256").update(buffer).digest("hex");
					console.log(`| ${file} | ${hash} |`);
				}
			}
		}
	}
}
