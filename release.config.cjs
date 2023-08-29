module.exports = {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/changelog",
		"@semantic-release/npm",
		[
			"@semantic-release/github",
			{
				assets: [
					{
						path: "releases/youtube-enhancer-v${nextRelease.version}.zip",
						name: "youtube-enhancer-v${nextRelease.version}.zip"
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
		]
	],
	preset: "angular",
	branches: ["main", "dev"]
};
