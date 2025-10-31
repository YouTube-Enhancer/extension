module.exports = {
	branches: ["main", "dev"],
	plugins: [
		[
			"@semantic-release/commit-analyzer",
			{
				preset: "angular",
				releaseRules: [
					{ release: "patch", type: "translations" },
					{
						release: "patch",
						type: "refactor"
					}
				]
			}
		],
		"@semantic-release/release-notes-generator",
		"@semantic-release/changelog",
		[
			"@semantic-release/github",
			{
				assets: [
					{
						path: "releases/**/*.zip"
					}
				]
			}
		],
		[
			"@semantic-release/git",
			{
				assets: ["CHANGELOG.md", "package.json", "package-lock.json"],
				message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
			}
		],
		[
			"@semantic-release/exec",
			{
				generateNotesCmd: "node scripts/generateReleaseHashes.js",
				verifyReleaseCmd: "node scripts/updateVersionAndBuild.js ${nextRelease.version}"
			}
		]
	],
	preset: "angular"
};
