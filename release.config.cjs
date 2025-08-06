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
				generateNotesCmd: "bash generateReleaseHashes.sh",
				verifyReleaseCmd:
					"node -e \"let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));packageJson.version = '${nextRelease.version}';fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));\";npm run build"
			}
		]
	],
	preset: "angular"
};
