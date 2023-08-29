module.exports = {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/changelog",
		"@semantic-release/github"
	],
	preset: "angular",
	branches: ["main", "dev"]
};
