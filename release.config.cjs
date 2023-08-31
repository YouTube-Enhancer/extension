module.exports = {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/changelog",
		[
			"@semantic-release/github",
			{
				assets: [
					{
						path: "releases/*.zip",
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
		],
		[
			"@semantic-release/exec",
			{
				verifyReleaseCmd: 'npm version ${nextRelease.version} -m "chore(release): ${nextRelease.version}";npm run build'
			}
		]
	],
	preset: "angular",
	branches: ["main", "dev"]
};
